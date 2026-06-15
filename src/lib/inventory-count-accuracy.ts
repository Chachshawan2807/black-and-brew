/**
 * Count accuracy compares the physical count against system stock in inventory_items
 * at verification time. Manual overrides on the main inventory page do not create
 * verification rows — only entries from the stock-taking count page do.
 */
export function isCountMatch(countedQty: number, systemStockQty: number): boolean {
  return countedQty === systemStockQty;
}
