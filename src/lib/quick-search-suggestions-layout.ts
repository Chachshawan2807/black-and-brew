export type QuickSearchSuggestionsPlacement = 'below' | 'above';

type AnchorRect = Pick<DOMRect, 'top' | 'bottom' | 'left' | 'width'>;

export type SuggestionsViewport = {
  offsetTop: number;
  offsetLeft?: number;
  visibleHeight: number;
  visibleWidth?: number;
};

const MIN_SUGGESTIONS_HEIGHT = 80;
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

  let width = Math.min(anchorRect.width, maxWidth);
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

export function getQuickSearchSuggestionsPlacement(
  spaceBelow: number,
  spaceAbove: number,
): QuickSearchSuggestionsPlacement {
  if (spaceBelow >= MIN_SUGGESTIONS_HEIGHT && spaceBelow >= spaceAbove) {
    return 'below';
  }
  return 'above';
}

/** Fixed-position box for a portaled suggestions list anchored to the search input. */
export function getAnchoredSuggestionsOverlayStyle(
  anchorRect: AnchorRect,
  viewport: SuggestionsViewport,
  gap = 8,
): {
  position: 'fixed';
  left: number;
  width: number;
  maxWidth: string;
  top?: number;
  bottom?: number;
  maxHeight: number;
  placement: QuickSearchSuggestionsPlacement;
} {
  const viewportBottom = viewport.offsetTop + viewport.visibleHeight;
  const spaceBelow = viewportBottom - anchorRect.bottom - gap;
  const spaceAbove = anchorRect.top - viewport.offsetTop - gap;
  const placement = getQuickSearchSuggestionsPlacement(spaceBelow, spaceAbove);
  const horizontal = clampSuggestionsHorizontal(anchorRect, viewport);

  if (placement === 'below') {
    return {
      position: 'fixed',
      ...horizontal,
      top: anchorRect.bottom + gap,
      maxHeight: Math.max(MIN_SUGGESTIONS_HEIGHT, spaceBelow),
      placement,
    };
  }

  const maxHeight = Math.max(MIN_SUGGESTIONS_HEIGHT, spaceAbove);
  return {
    position: 'fixed',
    ...horizontal,
    bottom: viewportBottom - anchorRect.top + gap,
    maxHeight,
    placement,
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
