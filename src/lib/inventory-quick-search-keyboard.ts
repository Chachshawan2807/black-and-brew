/** Keyboard highlight navigation for inventory quick-search suggestions. */

export const QUICK_SEARCH_NO_HIGHLIGHT = -1;

export function stepQuickSearchHighlight(
  current: number,
  count: number,
  direction: 'up' | 'down',
): number {
  if (count <= 0) return QUICK_SEARCH_NO_HIGHLIGHT;

  if (direction === 'down') {
    if (current < 0) return 0;
    return Math.min(current + 1, count - 1);
  }

  if (current <= 0) return QUICK_SEARCH_NO_HIGHLIGHT;
  return current - 1;
}

export function resolveQuickSearchHighlightForEnter(
  highlighted: number,
  count: number,
): number | null {
  if (count <= 0) return null;
  if (highlighted >= 0 && highlighted < count) return highlighted;
  if (highlighted === QUICK_SEARCH_NO_HIGHLIGHT) return 0;
  return null;
}
