export type QuickSearchSuggestionsPlacement = 'below' | 'above';

type AnchorRect = Pick<DOMRect, 'top' | 'bottom' | 'left' | 'width'>;

export function shouldPortalQuickSearchSuggestions(
  isMobile: boolean,
  isKeyboardOpen: boolean,
): boolean {
  return isMobile && isKeyboardOpen;
}

export function getQuickSearchSuggestionsPlacement(
  isMobile: boolean,
  isKeyboardOpen: boolean,
): QuickSearchSuggestionsPlacement {
  return isMobile && isKeyboardOpen ? 'above' : 'below';
}

/** Fixed-position box for a portaled suggestions list anchored to the search input. */
export function getAnchoredSuggestionsOverlayStyle(
  anchorRect: AnchorRect,
  placement: QuickSearchSuggestionsPlacement,
  viewportHeight: number,
  gap = 8,
): {
  position: 'fixed';
  left: number;
  width: number;
  maxWidth: string;
  top?: number;
  bottom?: number;
  maxHeight: number;
} {
  const width = anchorRect.width;
  const left = anchorRect.left;

  if (placement === 'above') {
    const spaceAbove = Math.max(0, anchorRect.top - gap);
    return {
      position: 'fixed',
      left,
      width,
      maxWidth: 'min(100vw - 2rem, 20rem)',
      bottom: viewportHeight - anchorRect.top + gap,
      maxHeight: Math.max(120, spaceAbove),
    };
  }

  const spaceBelow = Math.max(0, viewportHeight - anchorRect.bottom - gap);
  return {
    position: 'fixed',
    left,
    width,
    maxWidth: 'min(100vw - 2rem, 20rem)',
    top: anchorRect.bottom + gap,
    maxHeight: Math.max(120, spaceBelow),
  };
}
