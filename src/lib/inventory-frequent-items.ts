export type FrequentItem = { id: string; name: string };

export const FREQUENT_ITEMS_CACHE_KEY = 'bb-frequent-inventory-items:v1';
export const FREQUENT_ITEMS_LIMIT = 7;
const CACHE_VERSION = 1;

type FrequentTxRow = { inventory_item_id: string | null };

/** Rank inventory item ids by recent transaction frequency (most used first). */
export function rankFrequentItemIds(
  rows: FrequentTxRow[],
  limit: number = FREQUENT_ITEMS_LIMIT,
): string[] {
  const counts: Record<string, number> = {};
  for (const tx of rows) {
    const id = tx.inventory_item_id;
    if (id) counts[id] = (counts[id] || 0) + 1;
  }

  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([id]) => id);
}

/** Preserve topIds order while resolving names from an id→name catalog. */
export function resolveFrequentItemNames(
  topIds: string[],
  items: Array<{ id: string; name: string }>,
): FrequentItem[] {
  const byId = new Map(items.map((item) => [item.id, item.name]));
  return topIds.flatMap((id) => {
    const name = byId.get(id);
    return name ? [{ id, name }] : [];
  });
}

type CachePayload = {
  v: number;
  items: FrequentItem[];
};

function sanitizeFrequentItems(items: FrequentItem[]): FrequentItem[] {
  return items
    .filter(
      (item): item is FrequentItem =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.name === 'string',
    )
    .slice(0, FREQUENT_ITEMS_LIMIT);
}

export function loadFrequentItemsCache(): FrequentItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FREQUENT_ITEMS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CachePayload;
    if (parsed?.v !== CACHE_VERSION || !Array.isArray(parsed.items)) return [];
    return sanitizeFrequentItems(parsed.items);
  } catch {
    return [];
  }
}

export function saveFrequentItemsCache(items: FrequentItem[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const payload: CachePayload = { v: CACHE_VERSION, items: sanitizeFrequentItems(items) };
    localStorage.setItem(FREQUENT_ITEMS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

/** Optimistically bump an item to the front of the frequent list. */
export function touchFrequentItemInCache(item: FrequentItem): FrequentItem[] {
  const prev = loadFrequentItemsCache().filter((row) => row.id !== item.id);
  const next = sanitizeFrequentItems([item, ...prev]);
  saveFrequentItemsCache(next);
  return next;
}
