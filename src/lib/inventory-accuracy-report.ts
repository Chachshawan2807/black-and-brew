import type { ItemCountAccuracyStats } from '@/app/actions/inventory-actions';

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

export function sortHighDiscrepancyItems(
  items: HighDiscrepancyItem[],
  options: HighDiscrepancySortOptions,
): HighDiscrepancyItem[] {
  const { sortBy, sortOrder } = options;

  return [...items].sort((a, b) => {
    if (sortBy === 'discrepancy') {
      const byQty = compareNumbers(a.totalDiscrepancyQty, b.totalDiscrepancyQty, sortOrder);
      if (byQty !== 0) return byQty;
      return compareNumbers(a.accuracyPct ?? 0, b.accuracyPct ?? 0, sortOrder);
    }

    const byAccuracy = compareNumbers(a.accuracyPct ?? 0, b.accuracyPct ?? 0, sortOrder);
    if (byAccuracy !== 0) return byAccuracy;
    return compareNumbers(a.totalDiscrepancyQty, b.totalDiscrepancyQty, sortOrder);
  });
}
