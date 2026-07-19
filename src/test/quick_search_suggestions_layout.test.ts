import { describe, expect, test } from 'vitest';
import {
  getAnchoredSuggestionsOverlayStyle,
  getQuickSearchSuggestionsPlacement,
  shouldPortalQuickSearchSuggestions,
} from '@/lib/quick-search-suggestions-layout';

describe('quick search suggestions layout', () => {
  test('portals suggestions above the input when mobile keyboard is open', () => {
    expect(shouldPortalQuickSearchSuggestions(true, true)).toBe(true);
    expect(getQuickSearchSuggestionsPlacement(true, true)).toBe('above');
    expect(shouldPortalQuickSearchSuggestions(true, false)).toBe(false);
    expect(getQuickSearchSuggestionsPlacement(true, false)).toBe('below');
    expect(shouldPortalQuickSearchSuggestions(false, true)).toBe(false);
  });

  test('anchors portaled suggestions above the search input inside the visible viewport', () => {
    const style = getAnchoredSuggestionsOverlayStyle(
      { top: 180, bottom: 220, left: 16, width: 320 },
      'above',
      420,
    );

    expect(style.bottom).toBe(248);
    expect(style.top).toBeUndefined();
    expect(style.left).toBe(16);
    expect(style.maxHeight).toBe(172);
  });

  test('anchors portaled suggestions below the search input when keyboard is closed', () => {
    const style = getAnchoredSuggestionsOverlayStyle(
      { top: 120, bottom: 160, left: 24, width: 280 },
      'below',
      700,
    );

    expect(style.top).toBe(168);
    expect(style.bottom).toBeUndefined();
    expect(style.maxHeight).toBe(532);
  });
});
