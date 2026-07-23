import { describe, expect, test } from 'vitest';
import {
  getAnchoredSuggestionsOverlayStyle,
  getQuickSearchSuggestionsPlacement,
  shouldCollapseBulkQueueForMobileSearch,
  shouldPortalQuickSearchSuggestions,
} from '@/lib/quick-search-suggestions-layout';

describe('quick search suggestions layout', () => {
  test('portals suggestions whenever mobile search is focused', () => {
    expect(shouldPortalQuickSearchSuggestions(true, true)).toBe(true);
    expect(shouldPortalQuickSearchSuggestions(true, false)).toBe(false);
    expect(shouldPortalQuickSearchSuggestions(false, true)).toBe(false);
  });

  test('prefers below placement when there is more room under the input', () => {
    expect(getQuickSearchSuggestionsPlacement(220, 80)).toBe('below');
    expect(getQuickSearchSuggestionsPlacement(60, 180)).toBe('above');
  });

  test('anchors portaled suggestions below the input using top positioning', () => {
    const style = getAnchoredSuggestionsOverlayStyle(
      { top: 120, bottom: 160, left: 16, width: 320 },
      { offsetTop: 0, visibleHeight: 420 },
    );

    expect(style.placement).toBe('below');
    expect(style.top).toBe(168);
    expect(style.maxHeight).toBe(252);
  });

  test('anchors portaled suggestions in the visible band above the input', () => {
    const style = getAnchoredSuggestionsOverlayStyle(
      { top: 180, bottom: 220, left: 16, width: 320 },
      { offsetTop: 0, visibleHeight: 420 },
    );

    expect(style.placement).toBe('below');
    expect(style.top).toBe(228);
  });

  test('anchors portaled suggestions directly above the input when space below is limited', () => {
    const style = getAnchoredSuggestionsOverlayStyle(
      { top: 180, bottom: 220, left: 16, width: 320 },
      { offsetTop: 0, visibleHeight: 220 },
    );

    expect(style.placement).toBe('above');
    expect(style.bottom).toBe(48);
    expect(style.top).toBeUndefined();
    expect(style.maxHeight).toBe(172);
  });

  test('collapses bulk queue while mobile suggestions are visible', () => {
    expect(shouldCollapseBulkQueueForMobileSearch(true, true, true)).toBe(true);
    expect(shouldCollapseBulkQueueForMobileSearch(true, true, false)).toBe(false);
    expect(shouldCollapseBulkQueueForMobileSearch(false, true, true)).toBe(false);
  });
});
