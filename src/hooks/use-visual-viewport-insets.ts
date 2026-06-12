'use client';

import { useEffect, useState } from 'react';

export type VisualViewportInsets = {
  /** Pixels obscured at the bottom (keyboard, browser chrome). */
  bottomInset: number;
  /** Top offset of the visible viewport within the layout viewport. */
  offsetTop: number;
  /** Height of the visible viewport. */
  visibleHeight: number;
  /** Software keyboard is likely open. */
  isKeyboardOpen: boolean;
};

const KEYBOARD_OPEN_THRESHOLD_PX = 50;

const DEFAULT_INSETS: VisualViewportInsets = {
  bottomInset: 0,
  offsetTop: 0,
  visibleHeight: 0,
  isKeyboardOpen: false,
};

function readVisualViewportInsets(): VisualViewportInsets {
  if (typeof window === 'undefined') return DEFAULT_INSETS;

  const vv = window.visualViewport;
  if (!vv) {
    return {
      bottomInset: 0,
      offsetTop: 0,
      visibleHeight: window.innerHeight,
      isKeyboardOpen: false,
    };
  }

  const bottomInset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);

  return {
    bottomInset,
    offsetTop: vv.offsetTop,
    visibleHeight: vv.height,
    isKeyboardOpen: bottomInset > KEYBOARD_OPEN_THRESHOLD_PX,
  };
}

/** Track mobile software-keyboard insets via Visual Viewport API. */
export function useVisualViewportInsets(enabled = true): VisualViewportInsets {
  const [insets, setInsets] = useState<VisualViewportInsets>(DEFAULT_INSETS);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const update = () => setInsets(readVisualViewportInsets());

    const vv = window.visualViewport;
    vv?.addEventListener('resize', update);
    vv?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    update();

    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [enabled]);

  return insets;
}
