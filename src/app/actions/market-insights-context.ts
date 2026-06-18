import type { SalesMetrics } from './sales-actions';
import {
  flattenWorkingShiftEntries,
  type FormattedDailyShifts,
} from '@/lib/schedule/format-daily-shifts';
import type {
  SalesSnapshot,
  ScheduleEntry,
  MarketAlert,
  MarketInsightsV2,
  MarketInsightsDiff,
  LocalEventEntry,
} from './market-insights-types';

export function buildSalesContext(metrics: SalesMetrics | null): string {
  if (!metrics) return 'N/A';

  const { overview: o, topProducts, categoryMetrics, comparisons, monthlyMetrics } = metrics;
  const top = topProducts
    .slice(0, 5)
    .map((p) => `${p.productName}(${p.totalQuantity}/${Math.round(p.totalRevenue)})`)
    .join(',');
  const cats = categoryMetrics
    .slice(0, 4)
    .map((c) => `${c.category || 'อื่นๆ'}:${c.revenuePercentage.toFixed(0)}%`)
    .join(',');
  const mom = comparisons.mom;
  const momStr = mom
    ? ` MoM:${mom.changePercentage >= 0 ? '+' : ''}${mom.changePercentage.toFixed(1)}%`
    : '';
  const lastMonth = monthlyMetrics.at(-1);
  const monthStr = lastMonth
    ? ` ล่าสุด:${lastMonth.year}-${String(lastMonth.month).padStart(2, '0')}=${Math.round(lastMonth.totalRevenue)}`
    : '';

  return [
    `rev=${Math.round(o.totalRevenue)} qty=${o.totalQuantity} tx=${o.totalTransactions} avg=${Math.round(o.avgTransactionValue)}`,
    `range=${o.dateRange.start}→${o.dateRange.end}`,
    `top:${top}`,
    `cat:${cats}${momStr}${monthStr}`,
  ].join(' | ');
}

export function buildInventoryContext(
  items: { name: string; stock: number; orderPoint: number; targetStock: number; unit: string; isLowStock: boolean }[],
  purchaseOrders: { name: string | null; qty_to_order: number | null; unit: string | null }[],
  recentTx: { item_name: string | null; type: string | null; quantity: number | null; created_at_local: string | null }[]
): string {
  if (items.length === 0) return 'N/A';

  const low = items.filter((i) => i.isLowStock).map((i) => `${i.name}:${i.stock}${i.unit}`);
  const over = items
    .filter((i) => i.stock > i.targetStock * 1.5 && i.targetStock > 0)
    .map((i) => i.name);
  const po = purchaseOrders
    .slice(0, 5)
    .map((p) => `${p.name}+${p.qty_to_order}${p.unit}`)
    .join(',');
  const tx = recentTx
    .slice(0, 5)
    .map((t) => `${t.type} ${t.item_name} x${t.quantity}`)
    .join(', ');

  return [
    `items=${items.length} low=[${low.join(',')}]`,
    over.length ? `over=[${over.join(',')}]` : null,
    po ? `PO:[${po}]` : null,
    tx ? `tx:[${tx}]` : null,
  ]
    .filter(Boolean)
    .join(' | ');
}

export function buildScheduleContext(
  schedule: { full_name: string; start_time_local: string; end_time_local: string; status: string }[]
): string {
  if (!schedule.length) return 'N/A';
  return schedule
    .map((s) => `${s.full_name} ${s.start_time_local}-${s.end_time_local}(${s.status})`)
    .join(', ');
}

/** Cross-domain signals for AI — internal hints, not user-facing data dumps */
export function buildAnalyticalSignals(
  sales: SalesMetrics | null,
  items: { name: string; stock: number; isLowStock: boolean }[],
  topProductNames: string[],
  weather: string,
  externalTrends: string
): string {
  const signals: string[] = [];

  if (sales?.comparisons.mom) {
    const { changePercentage } = sales.comparisons.mom;
    if (changePercentage > 5) signals.push('sales_momentum:positive');
    else if (changePercentage < -5) signals.push('sales_momentum:declining');
  }

  if (sales?.categoryMetrics.length) {
    const top = sales.categoryMetrics[0];
    const weak = sales.categoryMetrics.at(-1);
    if (top && weak && top.category !== weak.category) {
      signals.push(`category_gap:${top.category}_strong_vs_${weak.category || 'other'}_weak`);
    }
  }

  const lowNames = new Set(items.filter((i) => i.isLowStock).map((i) => i.name.toLowerCase()));
  if (lowNames.size && topProductNames.length) {
    signals.push('check:top_sellers_vs_low_stock_overlap');
  }

  if (weather.includes('ฝน') || weather.includes('rain')) signals.push('weather:rainy');
  if (weather.match(/\d+°C/) && parseInt(weather.match(/(\d+)°C/)?.[1] ?? '0', 10) >= 33) {
    signals.push('weather:hot');
  }

  if (externalTrends !== 'N/A') {
    const trendLower = externalTrends.toLowerCase();
    if (trendLower.includes('matcha') || trendLower.includes('มัทฉะ')) signals.push('market:matcha_interest');
    if (trendLower.includes('oat') || trendLower.includes('โอ๊ต')) signals.push('market:oat_milk_interest');
  }

  return signals.length ? signals.join(', ') : 'baseline:stable_operations';
}

// ─── v2 deterministic builders (UI-facing, no AI) ──────────────────────────────

/** Signals as a discrete list (v2 UI chips) — reuses the v1 string builder. */
export function buildSignalsList(
  sales: SalesMetrics | null,
  items: { name: string; stock: number; isLowStock: boolean }[],
  topProductNames: string[],
  weather: string,
  externalTrends: string
): string[] {
  const joined = buildAnalyticalSignals(sales, items, topProductNames, weather, externalTrends);
  return joined.split(',').map((s) => s.trim()).filter(Boolean);
}

export function buildSalesSnapshot(metrics: SalesMetrics | null): SalesSnapshot {
  if (!metrics) {
    return {
      momChangePercentage: null,
      momDetail: null,
      topProducts: [],
      categoryBreakdown: [],
      monthlyTrend: [],
    };
  }

  const topProducts = metrics.topProducts.slice(0, 5).map((p) => ({
    productName: p.productName,
    totalQuantity: p.totalQuantity,
    totalRevenue: Math.round(p.totalRevenue),
  }));

  const categoryBreakdown = metrics.categoryMetrics.slice(0, 6).map((c) => ({
    category: c.category || 'อื่นๆ',
    revenuePercentage: Number(c.revenuePercentage.toFixed(1)),
    totalRevenue: Math.round(c.totalRevenue),
  }));

  const monthlyTrend = metrics.monthlyMetrics.slice(-6).map((m) => ({
    label: `${m.year}-${String(m.month).padStart(2, '0')}`,
    totalRevenue: Math.round(m.totalRevenue),
  }));

  const mom = metrics.comparisons.mom;
  let momDetail: SalesSnapshot['momDetail'] = null;
  if (mom && metrics.monthlyMetrics.length >= 2) {
    const current = metrics.monthlyMetrics.at(-1)!;
    const previous = metrics.monthlyMetrics.at(-2)!;
    momDetail = {
      currentLabel: `${current.year}-${String(current.month).padStart(2, '0')}`,
      previousLabel: `${previous.year}-${String(previous.month).padStart(2, '0')}`,
      currentRevenue: Math.round(mom.currentMonthRevenue),
      previousRevenue: Math.round(mom.previousMonthRevenue),
      changeAbsolute: Math.round(mom.changeAbsolute),
    };
  }

  return {
    momChangePercentage: mom ? Number(mom.changePercentage.toFixed(1)) : null,
    momDetail,
    topProducts,
    categoryBreakdown,
    monthlyTrend,
  };
}

export function buildScheduleEntries(
  schedule: { full_name: string; start_time_local: string; end_time_local: string; status: string }[]
): ScheduleEntry[] {
  return (schedule ?? []).map((s) => ({
    fullName: s.full_name,
    start: s.start_time_local,
    end: s.end_time_local,
    status: s.status,
  }));
}

/** Schedule entries ordered like the schedule page: shift time, then staff row order. */
export function buildScheduleEntriesFromFormattedShifts(
  formatted: FormattedDailyShifts
): ScheduleEntry[] {
  return flattenWorkingShiftEntries(formatted).map((entry) => ({
    fullName: entry.name,
    start: entry.shift,
    end: '',
    status: 'scheduled',
  }));
}

export function buildScheduleContextFromFormatted(formatted: FormattedDailyShifts): string {
  const entries = flattenWorkingShiftEntries(formatted);
  if (!entries.length) return 'N/A';
  return entries.map((entry) => `${entry.name} ${entry.shift}`).join(', ');
}

export function buildLocalEventsContext(events: LocalEventEntry[]): string {
  if (!events.length) return 'N/A';

  return events
    .slice(0, 6)
    .map((event) => {
      const details = [
        event.category,
        event.expectedImpact ? `impact=${event.expectedImpact}` : null,
        event.source ? `source=${event.source}` : null,
      ]
        .filter(Boolean)
        .join(',');
      return details ? `${event.date} ${event.name}(${details})` : `${event.date} ${event.name}`;
    })
    .join(' | ');
}

/**
 * Cross-domain alerts resolved to real item/product names — distinct from the
 * AI narrative. Surfaces actionable risks the manager should not miss.
 */
export function buildAlerts(
  items: { name: string; stock: number; orderPoint: number; targetStock: number; unit: string; isLowStock: boolean }[],
  topProductNames: string[],
  weather: string
): MarketAlert[] {
  const alerts: MarketAlert[] = [];

  const lowStockNames = items.filter((i) => i.isLowStock).map((i) => i.name);
  const topLower = topProductNames.map((n) => n.toLowerCase());
  const atRisk = lowStockNames.filter((name) =>
    topLower.some((t) => t.includes(name.toLowerCase()) || name.toLowerCase().includes(t))
  );

  if (atRisk.length) {
    alerts.push({
      type: 'stockout_risk',
      message: `วัตถุดิบของเมนูขายดีกำลังจะหมด อาจพลาดยอดขายช่วงพีค`,
      linkedItems: atRisk,
    });
  }

  const overstock = items
    .filter((i) => i.targetStock > 0 && i.stock > i.targetStock * 1.5)
    .map((i) => i.name);
  if (overstock.length) {
    alerts.push({
      type: 'overstock',
      message: `สต็อกเกินเป้าหมายมาก ควรเร่งระบายผ่านโปรโมชั่นเพื่อลดของเสีย`,
      linkedItems: overstock.slice(0, 6),
    });
  }

  if (weather.includes('ฝน') || weather.toLowerCase().includes('rain')) {
    alerts.push({
      type: 'weather',
      message: `มีแนวโน้มฝนช่วงเปิดร้าน เตรียมเมนูร้อน/บริการเดลิเวอรีและจัดที่นั่งในร่ม`,
    });
  }

  const hotMatch = weather.match(/(\d+)\s*°?C/);
  if (hotMatch && parseInt(hotMatch[1], 10) >= 33) {
    alerts.push({
      type: 'opportunity',
      message: `อากาศร้อนจัด ดันเมนูเย็น/ปั่นและโปรโมชั่นเครื่องดื่มเย็นเพิ่มยอด`,
    });
  }

  return alerts;
}

/** Compare against the previously cached run to highlight what changed. */
export function buildDiff(
  current: { signals: string[]; actionTitles: string[] },
  previous: MarketInsightsV2 | null
): MarketInsightsDiff | undefined {
  if (!previous) return undefined;

  const prevSignals = new Set(previous.context.signals);
  const prevActions = new Set(previous.actions.map((a) => a.title));

  const newSignals = current.signals.filter((s) => !prevSignals.has(s));
  const changedActionTitles = current.actionTitles.filter((t) => !prevActions.has(t));

  if (newSignals.length === 0 && changedActionTitles.length === 0) return undefined;
  return { newSignals, changedActionTitles };
}
