/** Instant substring filter for inventory quick-search autocomplete. */

export function filterInventoryQuickSearchItems<T extends { id: string; name: string }>(
  items: T[],
  query: string,
  limit = 10,
  excludeIds: Iterable<string> = [],
): T[] {
  const needle = query.trim().toLocaleLowerCase('th-TH');
  if (!needle) return [];
  const excluded = new Set(excludeIds);
  return items
    .filter(
      (item) =>
        !excluded.has(item.id) &&
        item.name.toLocaleLowerCase('th-TH').includes(needle),
    )
    .slice(0, limit);
}

export function shouldShowQuickSearchSuggestions(
  isFocused: boolean,
  query: string,
  matchCount: number,
): boolean {
  return isFocused && query.trim().length > 0 && matchCount > 0;
}
