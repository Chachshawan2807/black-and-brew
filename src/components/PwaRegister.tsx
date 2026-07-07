'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { readNotificationState } from '@/lib/notification-sync';
import { loadNotificationPreferences } from '@/lib/notification-preferences';
import {
  requestNotificationPermission,
  syncAppBadge,
  canRegisterServiceWorker,
  isBenignPushRegistrationError,
} from '@/lib/pwa-notification-bridge';
import {
  schedulePushSubscriptionMaintenance,
  wantsPushRegistration,
} from '@/lib/push-subscription-client';

export default function PwaRegister() {
  const params = useParams();
  const locale = (params?.locale as string) || 'th';

  useEffect(() => {
    if (!canRegisterServiceWorker()) return;

    const syncBadgeFromStorage = () => {
      void readNotificationState().then(({ unreadCount }) => {
        void syncAppBadge(unreadCount);
      });
    };

    const onNotificationClick = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | undefined;
      if (data?.type === 'NOTIFICATION_CLICK' && data.url) {
        syncBadgeFromStorage();
        window.location.href = data.url;
      }
    };

    const onResume = () => {
      if (document.visibilityState !== 'visible') return;
      syncBadgeFromStorage();
      schedulePushSubscriptionMaintenance(locale);
    };

    navigator.serviceWorker.addEventListener('message', onNotificationClick);
    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('focus', onResume);
    window.addEventListener('pageshow', onResume);
    window.addEventListener('bb-pin-authenticated', onResume);
    window.addEventListener('bb-notification-prefs-changed', onResume);

    const timeout = setTimeout(() => {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => navigator.serviceWorker.ready)
        .then(() => {
          syncBadgeFromStorage();
          const prefs = loadNotificationPreferences();
          if (wantsPushRegistration(prefs)) {
            void requestNotificationPermission();
            schedulePushSubscriptionMaintenance(locale);
          }
        })
        .catch((registrationError) => {
          if (isBenignPushRegistrationError(registrationError)) {
            console.warn(
              'SW registration skipped:',
              registrationError instanceof Error ? registrationError.message : registrationError,
            );
            return;
          }
          console.error('SW registration failed:', registrationError);
        });
    }, 1000);

    return () => {
      clearTimeout(timeout);
      navigator.serviceWorker.removeEventListener('message', onNotificationClick);
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('focus', onResume);
      window.removeEventListener('pageshow', onResume);
      window.removeEventListener('bb-pin-authenticated', onResume);
      window.removeEventListener('bb-notification-prefs-changed', onResume);
    };
  }, [locale]);

  return null;
}
