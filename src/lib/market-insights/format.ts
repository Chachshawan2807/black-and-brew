/** Locale-aware number formatting for Market Insights (ISO-style presentation). */

const THB = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  maximumFractionDigits: 0,
});

const THB_COMPACT = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const PCT = new Intl.NumberFormat('th-TH', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const INTEGER = new Intl.NumberFormat('th-TH');

/** Full currency e.g. ฿12,345 */
export function fmtCurrency(value: number): string {
  return THB.format(value);
}

/** Compact axis labels e.g. ฿12K */
export function fmtCurrencyCompact(value: number): string {
  return THB_COMPACT.format(value);
}

/** Signed percentage from a ratio e.g. 11.1 → +11.1% */
export function fmtPctChange(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return 'N/A';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/** Share of total e.g. 0.601 → 60.1% */
export function fmtShare(ratio: number): string {
  return PCT.format(ratio / 100);
}

/** Integer with grouping e.g. 1,234 */
export function fmtInteger(value: number): string {
  return INTEGER.format(value);
}

/** Month label from YYYY-MM */
export function fmtMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
}
