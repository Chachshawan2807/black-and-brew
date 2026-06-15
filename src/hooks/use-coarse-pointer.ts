'use client';

import { useEffect, useState } from 'react';

const COARSE_POINTER_QUERY = '(pointer: coarse), (hover: none)';

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
