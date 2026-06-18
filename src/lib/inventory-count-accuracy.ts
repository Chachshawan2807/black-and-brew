/**
 * Count accuracy compares the physical count against system stock in inventory_items
 * at verification time. Manual overrides on the main inventory page do not create
 * verification rows — only entries from the stock-taking count page do.
 */
export function isCountMatch(countedQty: number, systemStockQty: number): boolean {
  return countedQty === systemStockQty;
}

export function computeCountDiscrepancy(countedQty: number, systemStockQty: number): number {
  return Math.abs(Number(countedQty) - Number(systemStockQty));
}

export function computeCountAccuracyPct(countedQty: number, systemStockQty: number): number {
  const discrepancy = computeCountDiscrepancy(countedQty, systemStockQty);
  const denominator = Math.max(Number(countedQty) || 0, Number(systemStockQty) || 0, 1);
  return Math.max(0, Math.round((1 - discrepancy / denominator) * 1000) / 10);
}

export function computeAggregateCountAccuracyPct(
  totalDiscrepancyQty: number,
  totalComparedQty: number,
): number | null {
  if (totalComparedQty <= 0) return null;
  return Math.max(0, Math.round((1 - totalDiscrepancyQty / totalComparedQty) * 1000) / 10);
}
