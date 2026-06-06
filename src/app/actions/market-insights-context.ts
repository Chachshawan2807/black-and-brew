import type { SalesMetrics } from './sales-actions';

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
