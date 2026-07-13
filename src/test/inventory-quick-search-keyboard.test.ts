import { describe, expect, test } from 'vitest';
import {
  QUICK_SEARCH_NO_HIGHLIGHT,
  resolveQuickSearchHighlightForEnter,
  stepQuickSearchHighlight,
} from '@/lib/inventory-quick-search-keyboard';

describe('inventory-quick-search-keyboard', () => {
  test('stepQuickSearchHighlight moves down from no selection to first item', () => {
    expect(stepQuickSearchHighlight(QUICK_SEARCH_NO_HIGHLIGHT, 3, 'down')).toBe(0);
    expect(stepQuickSearchHighlight(0, 3, 'down')).toBe(1);
    expect(stepQuickSearchHighlight(2, 3, 'down')).toBe(2);
  });

  test('stepQuickSearchHighlight moves up and clears highlight at top', () => {
    expect(stepQuickSearchHighlight(2, 3, 'up')).toBe(1);
    expect(stepQuickSearchHighlight(1, 3, 'up')).toBe(0);
    expect(stepQuickSearchHighlight(0, 3, 'up')).toBe(QUICK_SEARCH_NO_HIGHLIGHT);
    expect(stepQuickSearchHighlight(QUICK_SEARCH_NO_HIGHLIGHT, 3, 'up')).toBe(
      QUICK_SEARCH_NO_HIGHLIGHT,
    );
  });

  test('stepQuickSearchHighlight returns no highlight when list is empty', () => {
    expect(stepQuickSearchHighlight(QUICK_SEARCH_NO_HIGHLIGHT, 0, 'down')).toBe(
      QUICK_SEARCH_NO_HIGHLIGHT,
    );
    expect(stepQuickSearchHighlight(1, 0, 'up')).toBe(QUICK_SEARCH_NO_HIGHLIGHT);
  });

  test('resolveQuickSearchHighlightForEnter prefers highlighted row then first match', () => {
    expect(resolveQuickSearchHighlightForEnter(1, 3)).toBe(1);
    expect(resolveQuickSearchHighlightForEnter(QUICK_SEARCH_NO_HIGHLIGHT, 3)).toBe(0);
    expect(resolveQuickSearchHighlightForEnter(QUICK_SEARCH_NO_HIGHLIGHT, 0)).toBeNull();
    expect(resolveQuickSearchHighlightForEnter(5, 3)).toBeNull();
  });
});
