'use client';

import { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { loadNotificationPreferences } from '@/lib/notification-preferences';
import { ensurePushSubscription } from '@/lib/push-subscription-client';

const RETRY_MS = [0, 2_000, 5_000, 12_000, 30_000];

/** Runs after PIN auth — registers Web Push subscription for cross-device alerts. */
export function PushSubscriptionManager() {
  const params = useParams();
  const locale = (params?.locale as string) || 'th';
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const clearTimers = () => {
      for (const timer of timersRef.current) clearTimeout(timer);
      timersRef.current = [];
    };

    const attemptRegister = async (attempt: number) => {
      const prefs = loadNotificationPreferences();
      if (!prefs.enabled || !prefs.systemNotifications) return;

      const ok = await ensurePushSubscription(locale);
      if (ok || attempt >= RETRY_MS.length - 1) return;

      const timer = setTimeout(() => {
        void attemptRegister(attempt + 1);
      }, RETRY_MS[attempt + 1]);
      timersRef.current.push(timer);
    };

    const schedule = () => {
      clearTimers();
      void attemptRegister(0);
    };

    schedule();
    window.addEventListener('bb-pin-authenticated', schedule);
    window.addEventListener('bb-notification-prefs-changed', schedule);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') schedule();
    });

    return () => {
      clearTimers();
      window.removeEventListener('bb-pin-authenticated', schedule);
      window.removeEventListener('bb-notification-prefs-changed', schedule);
    };
  }, [locale]);

  return null;
}
