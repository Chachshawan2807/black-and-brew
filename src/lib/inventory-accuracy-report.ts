import type { ItemCountAccuracyStats } from '@/app/actions/inventory-actions';
import { computeCountDiscrepancy } from '@/lib/inventory-count-accuracy';

export type HighDiscrepancyItem = ItemCountAccuracyStats & { itemId: string };

export type HighDiscrepancySortBy = 'discrepancy' | 'accuracy';
export type HighDiscrepancySortOrder = 'asc' | 'desc';

export type HighDiscrepancySortOptions = {
  sortBy: HighDiscrepancySortBy;
  sortOrder: HighDiscrepancySortOrder;
};

function compareNumbers(a: number, b: number, sortOrder: HighDiscrepancySortOrder): number {
  return sortOrder === 'asc' ? a - b : b - a;
}

/** Discrepancy from the most recent count only (matches the "ล่าสุด" row). */
export function latestCountDiscrepancyQty(item: ItemCountAccuracyStats): number {
  if (item.lastSystemStockQty === null || item.lastCountedQty === null) return 0;
  return computeCountDiscrepancy(item.lastCountedQty, item.lastSystemStockQty);
}

/** Items whose latest verification still does not match system stock. */
export function selectHighDiscrepancyItems(
  perItem: Record<string, ItemCountAccuracyStats>,
): HighDiscrepancyItem[] {
  return Object.entries(perItem)
    .map(([itemId, stats]) => ({ itemId, ...stats }))
    .filter((item) => item.lastMatched === false);
}

export function sortHighDiscrepancyItems(
  items: HighDiscrepancyItem[],
  options: HighDiscrepancySortOptions,
): HighDiscrepancyItem[] {
  const { sortBy, sortOrder } = options;

  return [...items].sort((a, b) => {
    if (sortBy === 'discrepancy') {
      const byQty = compareNumbers(
        latestCountDiscrepancyQty(a),
        latestCountDiscrepancyQty(b),
        sortOrder,
      );
      if (byQty !== 0) return byQty;
      return compareNumbers(a.accuracyPct ?? 0, b.accuracyPct ?? 0, sortOrder);
    }

    const byAccuracy = compareNumbers(a.accuracyPct ?? 0, b.accuracyPct ?? 0, sortOrder);
    if (byAccuracy !== 0) return byAccuracy;
    return compareNumbers(
      latestCountDiscrepancyQty(a),
      latestCountDiscrepancyQty(b),
      sortOrder,
    );
  });
}
