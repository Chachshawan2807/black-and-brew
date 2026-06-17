'use client';

import { useEffect, useState } from 'react';

const MAX_MD_MQ = '(max-width: 767px)';

/** `null` until client mount — avoids SSR mismatch. */
export function useMaxMd(): boolean | null {
  const [isMaxMd, setIsMaxMd] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(MAX_MD_MQ);
    const sync = () => setIsMaxMd(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return isMaxMd;
}
