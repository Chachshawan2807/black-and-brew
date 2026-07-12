/** Pure inventory table filter/sort ops — safe for Web Workers and unit tests. */

import { filterInventoryGridItems } from '@/lib/inventory-grid-search';

export const INVENTORY_TABLE_WORKER_THRESHOLD = 60;

export function shouldUseInventoryTableWorker(itemCount: number): boolean {
  return itemCount >= INVENTORY_TABLE_WORKER_THRESHOLD;
}

export function sortInventoryGridItems<T extends { sort_order?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export function processInventoryGridView<T extends { name: string; sort_order?: number }>(
  items: T[],
  query: string,
): T[] {
  const filtered = filterInventoryGridItems(items, query);
  return sortInventoryGridItems(filtered);
}

export function filterInventoryQuickSearchInWorker<
  T extends { id: string; name: string },
>(items: T[], query: string, limit = 10, excludeIds: string[] = []): T[] {
  const needle = query.trim().toLocaleLowerCase('th-TH');
  if (!needle) return [];
  const excluded = new Set(excludeIds);
  const matches: T[] = [];
  for (const item of items) {
    if (excluded.has(item.id)) continue;
    if (item.name.toLocaleLowerCase('th-TH').includes(needle)) {
      matches.push(item);
      if (matches.length >= limit) break;
    }
  }
  return matches;
}
