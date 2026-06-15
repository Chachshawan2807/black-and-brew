export const VIEWPORT_EDGE_GAP = 12;

export type ViewportBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Visible viewport (handles mobile browser chrome via visualViewport when available). */
export function getViewportBounds(gap = VIEWPORT_EDGE_GAP): ViewportBounds {
  if (typeof window === 'undefined') {
    return { left: gap, top: gap, width: 0, height: 0 };
  }

  const vv = window.visualViewport;
  if (vv) {
    return {
      left: vv.offsetLeft + gap,
      top: vv.offsetTop + gap,
      width: Math.max(0, vv.width - gap * 2),
      height: Math.max(0, vv.height - gap * 2),
    };
  }

  return {
    left: gap,
    top: gap,
    width: Math.max(0, window.innerWidth - gap * 2),
    height: Math.max(0, window.innerHeight - gap * 2),
  };
}

/** Position a floating element anchored to a click point, clamped inside the viewport. */
export function getAnchoredFloatingPosition(
  anchorX: number,
  anchorY: number,
  width: number,
  height: number,
  gap = VIEWPORT_EDGE_GAP,
): { left: number; top: number } {
  const bounds = getViewportBounds(gap);

  let left = anchorX - width / 2;
  let top = anchorY - height - gap;

  if (top < bounds.top) {
    top = anchorY + gap;
  }

  left = Math.max(bounds.left, Math.min(left, bounds.left + bounds.width - width));
  top = Math.max(bounds.top, Math.min(top, bounds.top + bounds.height - height));

  return { left, top };
}
