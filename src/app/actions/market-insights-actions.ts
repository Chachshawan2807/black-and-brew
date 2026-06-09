'use server';

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { formatInTimeZone } from 'date-fns-tz';
import { ensureServerSession } from '@/lib/security/server-auth';
import { fetchDailyShiftsByDate } from '@/lib/schedule/fetch-daily-shifts';
import { THAI_TIMEZONE } from '@/lib/timezone';
import { fetchComprehensiveInventoryData } from './inventory-actions';
import { getSalesMetrics } from './sales-actions';
import {
  buildSalesContext,
  buildInventoryContext,
  buildScheduleContextFromFormatted,
  buildSignalsList,
  buildSalesSnapshot,
  buildScheduleEntriesFromFormattedShifts,
  buildAlerts,
  buildDiff,
} from './market-insights-context';
import {
  fetchWeatherForecast,
  fetchUpcomingHolidays,
  fetchMarketTrends,
  STORE_LAT,
  STORE_LON,
} from './market-insights-fetch';
import { fetchNearbyCompetitors } from './market-insights-places';
import {
  behaviorTrendsSchema,
  strategyActionsSchema,
  isMarketInsightsV2,
  type MarketInsightsV2,
  type MarketContext,
  type ActionItem,
} from './market-insights-types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const getSupabaseAdmin = (): SupabaseClient | null => {
  const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseAdminKey) return null;
  return createClient(supabaseUrl, supabaseAdminKey);
};

const MODEL = google('gemini-2.5-flash');

const PERSONA_RULES = `คุณคือ "บรู" ที่ปรึกษากลยุทธ์ตลาด BLACKANDBREW ย่านลำลูกกา
ข้อมูลภายในด้านล่างเป็นข้อมูลดิบ — ห้ามอ่านซ้ำตัวเลข/รายการสต็อก/สถานะ DB ที่ผู้จัดการเห็นอยู่แล้ว
อนุญาตให้อ้างถึง "แนวโน้ม" ได้ เช่น ยอดโตขึ้น/หมวดไหนแข็ง-อ่อน แต่ห้ามพ่นตัวเลขดิบ
สไตล์: ไม่ทักทาย ไม่ตัวหนา ใช้ภาษาผู้หญิงลงท้าย ค่ะ/นะคะ กระชับ ทำได้จริง`;

// ─── Internal Supabase context (read-only) ─────────────────────────────────────

async function fetchSupabaseContext(supabase: SupabaseClient) {
  const [storeStatusRes, purchaseOrdersRes, recentTxRes] = await Promise.all([
    supabase.rpc('get_ai_store_status'),
    supabase.from('ai_purchase_orders_needed').select('name, qty_to_order, unit, source'),
    supabase
      .from('ai_recent_transactions')
      .select('item_name, type, quantity, balance_after, note, created_at_local')
      .limit(10),
  ]);

  for (const [label, res] of [
    ['store status', storeStatusRes],
    ['purchase orders', purchaseOrdersRes],
    ['recent tx', recentTxRes],
  ] as const) {
    if (res.error) console.error(`[fetchSupabaseContext] ${label}:`, res.error.message);
  }

  return {
    storeStatus: storeStatusRes.data,
    purchaseOrders: purchaseOrdersRes.data ?? [],
    recentTransactions: recentTxRes.data ?? [],
  };
}

// ─── Best-effort history persistence (never blocks the response) ───────────────

async function persistRun(supabase: SupabaseClient | null, payload: MarketInsightsV2): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('market_insight_runs').insert({
      generated_at: payload.generatedAt,
      context_json: payload.context,
      insights_json: { insights: payload.insights, actions: payload.actions },
      sources_json: payload.sources,
    });
    if (error) {
      // Table may not exist yet — log and continue (see docs/sql/market_insight_runs.sql).
      console.error('[persistRun] skipped:', error.message);
    }
  } catch (error) {
    console.error('[persistRun] Error:', error);
  }
}

// ─── Public v2 generator ───────────────────────────────────────────────────────

/**
 * AI-powered Market Insights v2.
 * Returns a structured payload: deterministic context + AI insights + actions +
 * external sources. Fully isolated; does not mutate shared modules.
 *
 * @param previous previously cached v2 payload (client-supplied) for diffing.
 */
export async function getMarketInsights(
  previous?: MarketInsightsV2 | null
): Promise<MarketInsightsV2 | null> {
  const auth = await ensureServerSession();
  if (!auth.ok) return null;

  const prev = isMarketInsightsV2(previous) ? previous : null;

  try {
    const supabase = getSupabaseAdmin();

    const todayBkk = formatInTimeZone(new Date(), THAI_TIMEZONE, 'yyyy-MM-dd');

    const [weather, trends, inventoryResult, salesMetrics, supabaseCtx, competitors, dailyShifts] =
      await Promise.all([
        fetchWeatherForecast(),
        fetchMarketTrends(),
        fetchComprehensiveInventoryData(),
        getSalesMetrics(),
        supabase ? fetchSupabaseContext(supabase) : Promise.resolve(null),
        fetchNearbyCompetitors(STORE_LAT, STORE_LON),
        fetchDailyShiftsByDate(todayBkk).catch((error) => {
          console.error('[getMarketInsights] daily shifts:', error);
          return null;
        }),
      ]);

    const upcomingHolidays = supabase ? await fetchUpcomingHolidays(supabase) : [];

    // ── Inventory ────────────────────────────────────────────────────────────
    let inventorySummary = 'N/A';
    let invItems: {
      name: string;
      stock: number;
      orderPoint: number;
      targetStock: number;
      unit: string;
      isLowStock: boolean;
    }[] = [];

    if (inventoryResult.success && inventoryResult.data) {
      invItems = inventoryResult.data.items;
      inventorySummary = buildInventoryContext(
        invItems,
        supabaseCtx?.purchaseOrders ?? [],
        supabaseCtx?.recentTransactions ?? []
      );
    }

    const salesSummary = buildSalesContext(salesMetrics);
    const scheduleSummary = dailyShifts ? buildScheduleContextFromFormatted(dailyShifts) : 'N/A';
    const shiftCount = supabaseCtx?.storeStatus
      ? ((supabaseCtx.storeStatus as { shifts?: unknown[] }).shifts?.length ?? 0)
      : 0;

    const topProductNames = salesMetrics?.topProducts.slice(0, 5).map((p) => p.productName) ?? [];
    const weatherStr = weather.operatingSummary;

    const signals = buildSignalsList(
      salesMetrics,
      invItems,
      topProductNames,
      weatherStr,
      trends.raw
    );
    const alerts = buildAlerts(invItems, topProductNames, weatherStr);

    // ── Deterministic context object (UI renders this even if AI fails) ───────
    const context: MarketContext = {
      weather,
      signals,
      salesSnapshot: buildSalesSnapshot(salesMetrics),
      scheduleToday: dailyShifts ? buildScheduleEntriesFromFormattedShifts(dailyShifts) : [],
      shiftCount,
      upcomingHolidays,
      alerts,
      competitors,
    };

    const dataBlock = [
      `[INTERNAL — ห้ามอ่านซ้ำตัวเลขดิบ]`,
      `SALES: ${salesSummary}`,
      `INV: ${inventorySummary}`,
      shiftCount ? `SHIFTS: ${shiftCount} | ${scheduleSummary}` : `SCHEDULE: ${scheduleSummary}`,
      `WEATHER: ${weatherStr}`,
      `HOLIDAYS: ${upcomingHolidays.map((h) => `${h.date} ${h.name}`).join(', ') || 'N/A'}`,
      `COMPETITORS: ${competitors.map((c) => `${c.name}(${c.rating ?? '-'})`).join(', ') || 'N/A'}`,
      `TRENDS: ${trends.raw}`,
      `SIGNALS: ${signals.join(', ') || 'baseline'}`,
    ].join('\n');

    // ── Step A — behavior + trends ────────────────────────────────────────────
    const stepA = await generateObject({
      model: MODEL,
      schema: behaviorTrendsSchema,
      system: PERSONA_RULES,
      temperature: 0.5,
      prompt: `${dataBlock}

วิเคราะห์เชิงลึก 2 ส่วน (ห้ามพูดตัวเลขดิบ/รายการสต็อก):
- behavior: พฤติกรรมผู้บริโภคย่านนี้ ทำไมซื้อ/ไม่ซื้อ โอกาสจากอากาศ+วันหยุด+คู่แข่ง (3-4 ข้อ)
- trends: จับคู่เทรนด์ภายนอกกับจุดแข็งร้าน เมนู/วัตถุดิบที่ควรดัน (3-4 ข้อ)
แต่ละข้อใส่ confidence (high/medium/low) และ reason สั้นๆ ว่าอ้างอิงสัญญาณใด`,
    });

    // ── Step B — strategy + actions (depends on Step A) ───────────────────────
    const behaviorTrendsDigest = [
      'BEHAVIOR:',
      ...stepA.object.behavior.map((b) => `- ${b.text}`),
      'TRENDS:',
      ...stepA.object.trends.map((t) => `- ${t.text}`),
    ].join('\n');

    const constraints = [
      `ALERTS: ${alerts.map((a) => `${a.type}:${a.message}`).join(' | ') || 'none'}`,
      `LOW_STOCK_LINKED: ${alerts.find((a) => a.type === 'stockout_risk')?.linkedItems?.join(',') || 'none'}`,
    ].join('\n');

    const stepB = await generateObject({
      model: MODEL,
      schema: strategyActionsSchema,
      system: PERSONA_RULES,
      temperature: 0.45,
      prompt: `จากบทวิเคราะห์ด้านล่างและข้อจำกัดสต็อก ออกแบบแผนปฏิบัติสัปดาห์นี้

${behaviorTrendsDigest}

${constraints}

- strategy: แผนกลยุทธ์/โปรโมชั่นเชิงภาพรวม (3-4 ข้อ พร้อม confidence + reason)
- actions: รายการที่ลงมือทำได้ทันที 3-5 ข้อ แต่ละข้อมี title, priority (1=สูงสุด), timeframe, expectedImpact, linkedProducts
ห้ามแนะนำให้ดันเมนูที่วัตถุดิบกำลังจะหมด เว้นแต่ระบุให้สั่งเติมก่อน`,
    });

    const actions: ActionItem[] = stepB.object.actions
      .slice()
      .sort((a, b) => a.priority - b.priority)
      .map((a, idx) => ({ ...a, id: `act-${idx + 1}` }));

    const generatedAt = new Date().toISOString();
    const diff = buildDiff(
      { signals, actionTitles: actions.map((a) => a.title) },
      prev
    );

    const payload: MarketInsightsV2 = {
      version: 2,
      generatedAt,
      context,
      insights: {
        behavior: stepA.object.behavior,
        trends: stepA.object.trends,
        strategy: stepB.object.strategy,
      },
      actions,
      sources: trends.sources,
      diff,
    };

    await persistRun(supabase, payload);

    return payload;
  } catch (error) {
    console.error('[getMarketInsights] Error:', error);
    return null;
  }
}
