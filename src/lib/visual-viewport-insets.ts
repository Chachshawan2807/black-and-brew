export const KEYBOARD_OPEN_THRESHOLD_PX = 50;

export type VisualViewportInsets = {
  /** Pixels obscured at the bottom (keyboard, browser chrome). */
  bottomInset: number;
  /** Top offset of the visible viewport within the layout viewport. */
  offsetTop: number;
  /** Left offset of the visible viewport within the layout viewport (iOS keyboard pan). */
  offsetLeft: number;
  /** Height of the visible viewport. */
  visibleHeight: number;
  /** Width of the visible viewport. */
  visibleWidth: number;
  /** Software keyboard is likely open. */
  isKeyboardOpen: boolean;
};

export type VisualViewportSnapshot = {
  innerHeight: number;
  innerWidth: number;
  layoutHeightBaseline: number;
  vv?: Pick<VisualViewport, 'height' | 'width' | 'offsetTop' | 'offsetLeft'> | null;
};

export const DEFAULT_VISUAL_VIEWPORT_INSETS: VisualViewportInsets = {
  bottomInset: 0,
  offsetTop: 0,
  offsetLeft: 0,
  visibleHeight: 0,
  visibleWidth: 0,
  isKeyboardOpen: false,
};

/** Track the tallest layout height seen so keyboard shrink is detectable with resizes-content. */
export function nextLayoutHeightBaseline(
  currentBaseline: number,
  innerHeight: number,
): number {
  return Math.max(currentBaseline, innerHeight);
}

/** Pure visual viewport read used by the hook and unit tests. */
export function computeVisualViewportInsets({
  innerHeight,
  innerWidth,
  layoutHeightBaseline,
  vv,
}: VisualViewportSnapshot): VisualViewportInsets {
  if (!vv) {
    const heightDrop = Math.max(0, layoutHeightBaseline - innerHeight);
    return {
      bottomInset: 0,
      offsetTop: 0,
      offsetLeft: 0,
      visibleHeight: innerHeight,
      visibleWidth: innerWidth,
      isKeyboardOpen: heightDrop > KEYBOARD_OPEN_THRESHOLD_PX,
    };
  }

  const bottomInset = Math.max(0, innerHeight - vv.height - vv.offsetTop);
  const heightDrop = Math.max(0, layoutHeightBaseline - innerHeight);
  const isKeyboardOpen =
    bottomInset > KEYBOARD_OPEN_THRESHOLD_PX ||
    heightDrop > KEYBOARD_OPEN_THRESHOLD_PX;

  return {
    bottomInset,
    offsetTop: vv.offsetTop,
    offsetLeft: vv.offsetLeft,
    visibleHeight: vv.height,
    visibleWidth: vv.width,
    isKeyboardOpen,
  };
}
