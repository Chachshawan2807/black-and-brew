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
