export type QuickSearchSuggestionsPlacement = 'below' | 'above';

type AnchorRect = Pick<DOMRect, 'top' | 'bottom' | 'left' | 'width'>;

export type SuggestionsViewport = {
  offsetTop: number;
  visibleHeight: number;
};

const MIN_SUGGESTIONS_HEIGHT = 80;

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

  if (placement === 'below') {
    return {
      position: 'fixed',
      left: anchorRect.left,
      width: anchorRect.width,
      maxWidth: 'min(100vw - 2rem, 20rem)',
      top: anchorRect.bottom + gap,
      maxHeight: Math.max(MIN_SUGGESTIONS_HEIGHT, spaceBelow),
      placement,
    };
  }

  const maxHeight = Math.max(MIN_SUGGESTIONS_HEIGHT, spaceAbove);
  return {
    position: 'fixed',
    left: anchorRect.left,
    width: anchorRect.width,
    maxWidth: 'min(100vw - 2rem, 20rem)',
    bottom: viewportBottom - anchorRect.top + gap,
    maxHeight,
    placement,
  };
}

/** Hide bulk queue rows while mobile search suggestions are active. */
export function shouldCollapseBulkQueueForMobileSearch(
  isMobile: boolean,
  isSearchFocused: boolean,
  hasSuggestions: boolean,
): boolean {
  return isMobile && isSearchFocused && hasSuggestions;
}
