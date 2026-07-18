'use client';

import { useEffect } from 'react';
import { preloadCommonRouteChunks } from '@/lib/route-chunk-preload';
import { scheduleIdleWork } from '@/lib/schedule-idle-work';

/**
 * Warms likely next-route JS chunks after first paint so sidebar taps feel instant on PWA.
 */
export function RoutePrefetchOnIdle() {
  useEffect(() => {
    let cancelled = false;

    const cancelIdle = scheduleIdleWork(
      () => {
        if (!cancelled) preloadCommonRouteChunks();
      },
      { timeout: 2500 },
    );

    const onAuthenticated = () => {
      if (!cancelled) preloadCommonRouteChunks();
    };

    window.addEventListener('bb-pin-authenticated', onAuthenticated);

    return () => {
      cancelled = true;
      cancelIdle();
      window.removeEventListener('bb-pin-authenticated', onAuthenticated);
    };
  }, []);

  return null;
}
