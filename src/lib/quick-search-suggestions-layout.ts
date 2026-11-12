export type QuickSearchSuggestionsPlacement = 'below';

type AnchorRect = Pick<DOMRect, 'top' | 'bottom' | 'left' | 'width'>;

export type SuggestionsViewport = {
  offsetTop: number;
  offsetLeft?: number;
  visibleHeight: number;
  visibleWidth?: number;
};

/** Full list panel height; options scroll inside instead of flipping or shrinking. */
export const ANCHORED_SUGGESTIONS_MAX_HEIGHT_PX = 240;

const SUGGESTIONS_EDGE_GAP = 16;

function clampSuggestionsHorizontal(
  anchorRect: AnchorRect,
  viewport: SuggestionsViewport,
): { left: number; width: number; maxWidth: string } {
  const offsetLeft = viewport.offsetLeft ?? 0;
  const visibleWidth = viewport.visibleWidth ?? anchorRect.width;
  const minLeft = offsetLeft + SUGGESTIONS_EDGE_GAP;
  const maxRight = offsetLeft + visibleWidth - SUGGESTIONS_EDGE_GAP;
  const maxWidth = Math.max(0, visibleWidth - SUGGESTIONS_EDGE_GAP * 2);

  const width = Math.min(anchorRect.width, maxWidth);
  let left = anchorRect.left;

  left = Math.max(minLeft, Math.min(left, maxRight - width));

  return {
    left,
    width,
    maxWidth: `${maxWidth}px`,
  };
}

export function shouldPortalQuickSearchSuggestions(
  isMobile: boolean,
  isSearchFocused: boolean,
): boolean {
  return isMobile && isSearchFocused;
}

/** Anchored overlays always open downward (never flip above the trigger). */
export function getQuickSearchSuggestionsPlacement(
  _spaceBelow?: number,
  _spaceAbove?: number,
  _forceBelow?: boolean,
): QuickSearchSuggestionsPlacement {
  return 'below';
}

/** Fixed-position box for a portaled suggestions list anchored to the search input. */
export function getAnchoredSuggestionsOverlayStyle(
  anchorRect: AnchorRect,
  viewport: SuggestionsViewport,
  gap = 8,
  _forceBelow = false,
): {
  position: 'fixed';
  left: number;
  width: number;
  maxWidth: string;
  top: number;
  maxHeight: number;
  placement: QuickSearchSuggestionsPlacement;
} {
  const horizontal = clampSuggestionsHorizontal(anchorRect, viewport);

  return {
    position: 'fixed',
    ...horizontal,
    top: anchorRect.bottom + gap,
    maxHeight: ANCHORED_SUGGESTIONS_MAX_HEIGHT_PX,
    placement: 'below',
  };
}

/** Hide bulk queue rows and chips while mobile search suggestions are active. */
export function shouldCollapseBulkQueueForMobileSearch(
  isMobile: boolean,
  isSearchFocused: boolean,
  hasSuggestions: boolean,
): boolean {
  return isMobile && isSearchFocused && hasSuggestions;
}

/** Hide non-essential quick-action chrome while mobile search is focused (prevents compositing bleed). */
export function shouldHideQuickActionChromeForMobileSearch(
  isMobile: boolean,
  isSearchFocused: boolean,
): boolean {
  return isMobile && isSearchFocused;
}
