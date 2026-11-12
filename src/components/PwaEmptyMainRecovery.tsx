'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isInstalledPwa } from '@/lib/pwa-app-badge';
import {
  isAppMainVisuallyEmpty,
  PWA_EMPTY_MAIN_RECOVERY_DELAY_MS,
  subscribePwaForegroundResume,
} from '@/lib/pwa-empty-main-recovery';
import { isIosWebKit } from '@/lib/pwa-standalone';
import { safeRouterRefresh } from '@/lib/warm-route-navigation';

const SESSION_KEY_PREFIX = 'bb-pwa-empty-main-retry:';

/**
 * iOS home-screen PWA shortcuts sometimes reuse an existing client (`navigate-existing`)
 * and leave #app-main empty while chrome + FAB still render. One soft refresh per path.
 */
export function PwaEmptyMainRecovery() {
  const pathname = usePathname();
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isInstalledPwa() || !isIosWebKit()) return;

    const scheduleCheck = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (document.visibilityState !== 'visible') return;
        const sessionKey = `${SESSION_KEY_PREFIX}${pathname}`;
        if (sessionStorage.getItem(sessionKey) === '1') return;

        const main = document.getElementById('app-main');
        if (!isAppMainVisuallyEmpty(main)) return;

        sessionStorage.setItem(sessionKey, '1');
        safeRouterRefresh(() => router.refresh());
      }, PWA_EMPTY_MAIN_RECOVERY_DELAY_MS);
    };

    scheduleCheck();

    const unsubscribeResume = subscribePwaForegroundResume(scheduleCheck);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      unsubscribeResume();
    };
  }, [pathname, router]);

  return null;
}
