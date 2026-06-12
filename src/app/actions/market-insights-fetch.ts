import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchTavily } from '@/lib/external/tavily-client';
import type {
  WeatherContext,
  WeatherHour,
  HolidayEntry,
  MarketSource,
} from './market-insights-types';

const STORE_LAT = process.env.NEXT_PUBLIC_STORE_LAT || '13.929692';
const STORE_LON = process.env.NEXT_PUBLIC_STORE_LON || '100.716933';

const EMPTY_WEATHER: WeatherContext = {
  current: null,
  hourly: [],
  operatingSummary: 'N/A',
};

// ─── Weather forecast (operating window 06:00–18:00 ICT) ───────────────────────

function hourInBangkok(unixSeconds: number): number {
  const hourStr = new Date(unixSeconds * 1000).toLocaleString('en-US', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    hour12: false,
  });
  return parseInt(hourStr, 10) % 24;
}

/**
 * Fetch 3-hour forecast from OpenWeather and keep only slots inside the store's
 * operating window. Self-contained (does not touch /api/weather route).
 */
export async function fetchWeatherForecast(): Promise<WeatherContext> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return EMPTY_WEATHER;

  try {
    const url =
      `https://api.openweathermap.org/data/2.5/forecast` +
      `?lat=${STORE_LAT}&lon=${STORE_LON}&appid=${apiKey}&units=metric&lang=th`;
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (!res.ok) return EMPTY_WEATHER;

    const data = (await res.json()) as {
      list?: Array<{
        dt: number;
        main?: { temp?: number; humidity?: number };
        weather?: Array<{ description?: string; icon?: string }>;
        wind?: { speed?: number };
        pop?: number;
        rain?: Record<string, number>;
      }>;
    };

    if (!data.list?.length) return EMPTY_WEATHER;

    const first = data.list[0];
    const current = {
      temp: Math.round(first.main?.temp ?? 0),
      description: first.weather?.[0]?.description ?? 'ไม่ทราบสภาพอากาศ',
      humidity: first.main?.humidity ?? 0,
      windSpeed: first.wind?.speed ?? 0,
      icon: first.weather?.[0]?.icon ?? '01d',
      pop: Math.round((first.pop ?? 0) * 100),
      rain: first.rain ? first.rain['3h'] ?? 0 : 0,
    };

    const hourly: WeatherHour[] = data.list
      .slice(0, 8)
      .filter((item) => {
        const h = hourInBangkok(item.dt);
        return h >= 6 && h <= 18;
      })
      .map((item) => ({
        time: new Date(item.dt * 1000).toLocaleTimeString('th-TH', {
          timeZone: 'Asia/Bangkok',
          hour: '2-digit',
          minute: '2-digit',
        }),
        temp: Math.round(item.main?.temp ?? 0),
        icon: item.weather?.[0]?.icon ?? '01d',
        pop: Math.round((item.pop ?? 0) * 100),
        rain: item.rain ? item.rain['3h'] ?? 0 : 0,
      }));

    const maxPop = hourly.reduce((m, h) => Math.max(m, h.pop), 0);
    const rainy = hourly.some((h) => h.rain > 0 || h.pop >= 50);
    const operatingSummary =
      hourly.length === 0
        ? `${current.description} ${current.temp}°C`
        : `${current.description} ${current.temp}°C · ช่วงเปิดร้านโอกาสฝน ~${maxPop}%${
            rainy ? ' (เตรียมรับมือฝน)' : ''
          }`;

    return { current, hourly, operatingSummary };
  } catch (error) {
    console.error('[fetchWeatherForecast] Error:', error);
    return EMPTY_WEATHER;
  }
}

// ─── Upcoming holidays (next N days) ───────────────────────────────────────────

export async function fetchUpcomingHolidays(
  supabase: SupabaseClient,
  daysAhead = 14
): Promise<HolidayEntry[]> {
  try {
    const today = new Date();
    const end = new Date(today.getTime() + daysAhead * 86_400_000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('holidays')
      .select('date, name')
      .gte('date', fmt(today))
      .lte('date', fmt(end))
      .order('date', { ascending: true });

    if (error) {
      console.error('[fetchUpcomingHolidays] Error:', error.message);
      return [];
    }

    return (data ?? []).map((h: { date: string; name: string }) => ({
      date: h.date,
      name: h.name,
    }));
  } catch (error) {
    console.error('[fetchUpcomingHolidays] Error:', error);
    return [];
  }
}

// ─── Multi-query Tavily trends with a dedicated in-memory cache ─────────────────

const TRENDS_CACHE_TTL_MS = 1_800_000; // 30 minutes
let trendsCache: { sources: MarketSource[]; raw: string; expiresAt: number } | null = null;

const TREND_QUERIES = [
  `coffee cafe promotion trends Lam Luk Ka Pathum Thani ${new Date().getFullYear()}`,
  `cafe menu trends Thailand matcha cold brew specialty coffee ${new Date().getFullYear()}`,
  `Lam Luk Ka Bueng Kham Phroi consumer spending cafe habits`,
];

export interface TrendsResult {
  sources: MarketSource[];
  /** Compact string for the AI prompt. */
  raw: string;
}

export async function fetchMarketTrends(): Promise<TrendsResult> {
  if (trendsCache && trendsCache.expiresAt > Date.now()) {
    return { sources: trendsCache.sources, raw: trendsCache.raw };
  }

  const seen = new Set<string>();
  const sources: MarketSource[] = [];

  const settled = await Promise.allSettled(
    TREND_QUERIES.map((q) =>
      fetchTavily(q, {
        userId: 'market-insights-service',
        searchDepth: 'advanced',
        maxResults: 4,
      })
    )
  );

  for (const result of settled) {
    if (result.status !== 'fulfilled') {
      console.error('[fetchMarketTrends] query failed:', result.reason);
      continue;
    }
    for (const r of result.value) {
      if (!r.url || seen.has(r.url)) continue;
      seen.add(r.url);
      sources.push({
        title: r.title || r.url,
        url: r.url,
        snippet: (r.content || '').slice(0, 220),
      });
    }
  }

  const raw =
    sources
      .slice(0, 8)
      .map((s) => `${s.title}: ${s.snippet.slice(0, 120)}`)
      .join(' | ')
      .slice(0, 700) || 'N/A';

  trendsCache = { sources, raw, expiresAt: Date.now() + TRENDS_CACHE_TTL_MS };
  return { sources, raw };
}

/** Test/diagnostic helper — clears the module-level trends cache. */
export function __clearTrendsCache(): void {
  trendsCache = null;
}

// ─── Competitor web context (single cached Tavily query) ───────────────────────

const COMPETITOR_WEB_CACHE_TTL_MS = 1_800_000; // 30 minutes
let competitorWebCache: { raw: string; expiresAt: number } | null = null;

/**
 * One lightweight Tavily query for competitor landscape news/snippets.
 * Cached 30 min; uses basic depth + 2 results to minimise API cost.
 */
export async function fetchCompetitorWebContext(): Promise<string> {
  if (competitorWebCache && competitorWebCache.expiresAt > Date.now()) {
    return competitorWebCache.raw;
  }

  try {
    const query = `ร้านกาแฟ คาเฟ่ ลำลูกกา บึงคำพรoye คู่แข่ง เปิดใหม่ ${new Date().getFullYear()}`;
    const results = await fetchTavily(query, {
      userId: 'market-insights-competitors',
      searchDepth: 'basic',
      maxResults: 2,
    });

    const raw =
      results
        .map((r) => `${r.title}: ${(r.content || '').slice(0, 100)}`)
        .join(' | ')
        .slice(0, 350) || '';

    competitorWebCache = { raw, expiresAt: Date.now() + COMPETITOR_WEB_CACHE_TTL_MS };
    return raw;
  } catch (error) {
    console.error('[fetchCompetitorWebContext] skipped:', error);
    return '';
  }
}

/** Test helper — clears competitor web cache. */
export function __clearCompetitorWebCache(): void {
  competitorWebCache = null;
}

export { STORE_LAT, STORE_LON };
