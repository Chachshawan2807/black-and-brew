/** Filter inventory grid rows by name substring (no result limit). */

export function filterInventoryGridItems<T extends { name: string }>(
  items: T[],
  query: string,
): T[] {
  const needle = query.trim().toLocaleLowerCase('th-TH');
  if (!needle) return items;
  return items.filter((item) =>
    item.name.toLocaleLowerCase('th-TH').includes(needle),
  );
}

/** Real list position for display — never the filtered-result index. */
export function getInventoryItemDisplayOrder(
  item: { sort_order?: number },
  fallbackIndex: number,
): number {
  const order = item.sort_order;
  if (typeof order === 'number' && order > 0) return order;
  return fallbackIndex + 1;
}
