'use client';

import { useEffect } from 'react';
import { preloadCommonRouteChunks } from '@/lib/route-chunk-preload';
import { scheduleIdleWork } from '@/lib/schedule-idle-work';

/**
 * Warms likely next-route JS chunks after first paint so sidebar taps feel instant on PWA.
 * After PIN, wait for idle so the home board fetch can use the network first.
 */
export function RoutePrefetchOnIdle() {
  useEffect(() => {
    let cancelled = false;
    let cancelIdleAfterPin = () => {};

    const cancelIdle = scheduleIdleWork(
      () => {
        if (!cancelled) preloadCommonRouteChunks();
      },
      { timeout: 2500 },
    );

    window.addEventListener('bb-pin-authenticated', onAuthenticated);

    function onAuthenticated() {
      cancelIdleAfterPin();
      cancelIdleAfterPin = scheduleIdleWork(
        () => {
          if (!cancelled) preloadCommonRouteChunks();
        },
        { timeout: 4000 },
      );
    }

    return () => {
      cancelled = true;
      cancelIdle();
      cancelIdleAfterPin();
      window.removeEventListener('bb-pin-authenticated', onAuthenticated);
    };
  }, []);

  return null;
}
