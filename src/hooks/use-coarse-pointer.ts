'use client';

import { useEffect, useState } from 'react';

const COARSE_POINTER_QUERY = '(pointer: coarse), (hover: none)';

type MediaQuerySource = Pick<Window, 'matchMedia'>;

/** Sync coarse-pointer check for first-paint scheduling (no React state delay). */
export function isCoarsePointer(media: MediaQuerySource | null = typeof window === 'undefined' ? null : window): boolean {
  if (!media?.matchMedia) return false;
  return media.matchMedia(COARSE_POINTER_QUERY).matches;
}

/**
 * True on touch-first devices where hover tooltips should be disabled
 * and drag handles need direct touch listeners (no Radix tooltip wrapper).
 */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(COARSE_POINTER_QUERY);
    const update = () => setCoarse(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return coarse;
}
