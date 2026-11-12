import { describe, expect, test } from 'vitest';
import {
  ANCHORED_SUGGESTIONS_MAX_HEIGHT_PX,
  getAnchoredSuggestionsOverlayStyle,
  getQuickSearchSuggestionsPlacement,
  shouldCollapseBulkQueueForMobileSearch,
  shouldHideQuickActionChromeForMobileSearch,
  shouldPortalQuickSearchSuggestions,
} from '@/lib/quick-search-suggestions-layout';

describe('quick search suggestions layout', () => {
  test('portals suggestions whenever mobile search is focused', () => {
    expect(shouldPortalQuickSearchSuggestions(true, true)).toBe(true);
    expect(shouldPortalQuickSearchSuggestions(true, false)).toBe(false);
    expect(shouldPortalQuickSearchSuggestions(false, true)).toBe(false);
  });

  test('always opens downward regardless of viewport space', () => {
    expect(getQuickSearchSuggestionsPlacement(220, 80)).toBe('below');
    expect(getQuickSearchSuggestionsPlacement(100, 180)).toBe('below');
    expect(getQuickSearchSuggestionsPlacement(60, 180)).toBe('below');
  });

  test('anchors portaled suggestions below the input using top positioning', () => {
    const style = getAnchoredSuggestionsOverlayStyle(
      { top: 120, bottom: 160, left: 16, width: 320 },
      { offsetTop: 0, visibleHeight: 420 },
    );

    expect(style.placement).toBe('below');
    expect(style.top).toBe(168);
    expect(style.maxHeight).toBe(ANCHORED_SUGGESTIONS_MAX_HEIGHT_PX);
  });

  test('keeps full scrollable height when space below the anchor is limited', () => {
    const style = getAnchoredSuggestionsOverlayStyle(
      { top: 180, bottom: 220, left: 16, width: 320 },
      { offsetTop: 0, visibleHeight: 220 },
    );

    expect(style.placement).toBe('below');
    expect(style.top).toBe(228);
    expect(style.maxHeight).toBe(ANCHORED_SUGGESTIONS_MAX_HEIGHT_PX);
  });

  test('clamps portaled suggestions within the visible viewport band on iOS keyboard pan', () => {
    const style = getAnchoredSuggestionsOverlayStyle(
      { top: 120, bottom: 160, left: 0, width: 390 },
      { offsetTop: 12, offsetLeft: 24, visibleHeight: 420, visibleWidth: 342 },
    );

    expect(style.left).toBeGreaterThanOrEqual(40);
    expect(style.left + style.width).toBeLessThanOrEqual(366);
    expect(style.width).toBeLessThanOrEqual(310);
  });

  test('collapses bulk queue while mobile suggestions are visible', () => {
    expect(shouldCollapseBulkQueueForMobileSearch(true, true, true)).toBe(true);
    expect(shouldCollapseBulkQueueForMobileSearch(true, true, false)).toBe(false);
    expect(shouldCollapseBulkQueueForMobileSearch(false, true, true)).toBe(false);
  });

  test('hides quick action chrome while mobile search is focused', () => {
    expect(shouldHideQuickActionChromeForMobileSearch(true, true)).toBe(true);
    expect(shouldHideQuickActionChromeForMobileSearch(true, false)).toBe(false);
    expect(shouldHideQuickActionChromeForMobileSearch(false, true)).toBe(false);
  });
});
