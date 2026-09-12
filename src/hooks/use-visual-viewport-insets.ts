'use client';

import { useEffect, useState } from 'react';
import {
  computeVisualViewportInsets,
  DEFAULT_VISUAL_VIEWPORT_INSETS,
  nextLayoutHeightBaseline,
  type VisualViewportInsets,
} from '@/lib/visual-viewport-insets';

export type { VisualViewportInsets };

let layoutHeightBaseline = 0;

function readVisualViewportInsets(): VisualViewportInsets {
  if (typeof window === 'undefined') return DEFAULT_VISUAL_VIEWPORT_INSETS;

  layoutHeightBaseline = nextLayoutHeightBaseline(
    layoutHeightBaseline,
    window.innerHeight,
  );

  return computeVisualViewportInsets({
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
    layoutHeightBaseline,
    vv: window.visualViewport,
  });
}

/** Track mobile software-keyboard insets via Visual Viewport API. */
export function useVisualViewportInsets(enabled = true): VisualViewportInsets {
  const [insets, setInsets] = useState<VisualViewportInsets>(
    DEFAULT_VISUAL_VIEWPORT_INSETS,
  );

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const update = () => setInsets(readVisualViewportInsets());
    const resetBaseline = () => {
      layoutHeightBaseline = window.innerHeight;
      update();
    };

    const vv = window.visualViewport;
    vv?.addEventListener('resize', update, { passive: true });
    vv?.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', resetBaseline, { passive: true });
    update();

    return () => {
      vv?.removeEventListener('resize', update);
      vv?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', resetBaseline);
    };
  }, [enabled]);

  return insets;
}
