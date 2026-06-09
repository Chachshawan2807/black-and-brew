import { z } from 'zod';

/**
 * Market Insights v2 — shared types + Zod schemas.
 *
 * Design:
 *  - `context.*` is deterministic (built from internal data, no AI) so the UI
 *    can render even if the AI step fails.
 *  - AI generates only `insights` (behavior/trends) and `strategy`/`actions`
 *    via `generateObject`, validated by the Zod schemas below.
 *  - `version: 2` + cache key `marketInsightsCache_v2` keep this isolated from
 *    the legacy v1 ({ behavior, trends, strategy } string) payload.
 */

// ─── AI-generated primitives (validated by Zod) ────────────────────────────────

export const insightBulletSchema = z.object({
  text: z.string().min(1),
  confidence: z.enum(['high', 'medium', 'low']),
  reason: z.string().optional(),
});

export const actionItemSchema = z.object({
  title: z.string().min(1),
  priority: z.number().int().min(1).max(3),
  timeframe: z.string().min(1),
  expectedImpact: z.string().min(1),
  linkedProducts: z.array(z.string()).default([]),
});

/** Step 2 — consumer behavior + external menu/ingredient trends. */
export const behaviorTrendsSchema = z.object({
  behavior: z.array(insightBulletSchema).min(1).max(5),
  trends: z.array(insightBulletSchema).min(1).max(5),
});

/** Step 3 — strategy bullets + concrete action checklist. */
export const strategyActionsSchema = z.object({
  strategy: z.array(insightBulletSchema).min(1).max(5),
  actions: z.array(actionItemSchema).min(1).max(6),
});

export type InsightBullet = z.infer<typeof insightBulletSchema>;
export type ActionItem = z.infer<typeof actionItemSchema> & { id: string };

// ─── Deterministic context (no AI) ─────────────────────────────────────────────

export interface WeatherHour {
  time: string;
  temp: number;
  icon: string;
  pop: number;
  rain: number;
}

export interface WeatherContext {
  current: {
    temp: number;
    description: string;
    humidity: number;
    windSpeed: number;
    icon: string;
    pop: number;
    rain: number;
  } | null;
  /** Hours filtered to the operating window (06:00–18:00 ICT). */
  hourly: WeatherHour[];
  operatingSummary: string;
}

export interface SalesSnapshot {
  momChangePercentage: number | null;
  topProducts: Array<{ productName: string; totalQuantity: number; totalRevenue: number }>;
  categoryBreakdown: Array<{ category: string; revenuePercentage: number; totalRevenue: number }>;
  monthlyTrend: Array<{ label: string; totalRevenue: number }>;
}

export interface ScheduleEntry {
  fullName: string;
  start: string;
  end: string;
  status: string;
}

export interface HolidayEntry {
  date: string;
  name: string;
}

export type AlertType = 'stockout_risk' | 'overstock' | 'weather' | 'opportunity';

export interface MarketAlert {
  type: AlertType;
  message: string;
  linkedItems?: string[];
}

export interface CompetitorEntry {
  name: string;
  rating?: number;
  userRatingsTotal?: number;
  vicinity?: string;
}

export interface MarketSource {
  title: string;
  url: string;
  snippet: string;
}

export interface MarketContext {
  weather: WeatherContext;
  signals: string[];
  salesSnapshot: SalesSnapshot;
  scheduleToday: ScheduleEntry[];
  shiftCount: number;
  upcomingHolidays: HolidayEntry[];
  alerts: MarketAlert[];
  competitors: CompetitorEntry[];
}

export interface MarketInsightsDiff {
  newSignals: string[];
  changedActionTitles: string[];
}

export interface MarketInsightsV2 {
  version: 2;
  generatedAt: string;
  context: MarketContext;
  insights: {
    behavior: InsightBullet[];
    trends: InsightBullet[];
    strategy: InsightBullet[];
  };
  actions: ActionItem[];
  sources: MarketSource[];
  diff?: MarketInsightsDiff;
}

/** Narrow unknown cached data to a v2 payload (validates essential shape). */
export function isMarketInsightsV2(value: unknown): value is MarketInsightsV2 {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<MarketInsightsV2>;
  if (v.version !== 2) return false;
  if (typeof v.context !== 'object' || v.context === null) return false;
  if (!Array.isArray(v.context.alerts)) return false;
  if (typeof v.insights !== 'object' || v.insights === null) return false;
  if (!Array.isArray(v.actions)) return false;
  if (!Array.isArray(v.sources)) return false;
  return true;
}

export const MARKET_INSIGHTS_CACHE_KEY_V2 = 'marketInsightsCache_v2';
export const MARKET_INSIGHTS_ACTIONS_KEY_V2 = 'marketInsightsActions_v2';
