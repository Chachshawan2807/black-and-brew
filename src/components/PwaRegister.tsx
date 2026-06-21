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
  refreshPushSubscriptionState,
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
      if (document.visibilityState === 'visible') {
        syncBadgeFromStorage();
      }
    };

    navigator.serviceWorker.addEventListener('message', onNotificationClick);
    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('focus', onResume);

    const onPrefsChange = () => {
      void refreshPushSubscriptionState(locale);
    };

    window.addEventListener('bb-notification-prefs-changed', onPrefsChange);

    const timeout = setTimeout(() => {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => navigator.serviceWorker.ready)
        .then(() => {
          syncBadgeFromStorage();
          const prefs = loadNotificationPreferences();
          if (wantsPushRegistration(prefs)) {
            void requestNotificationPermission();
            void refreshPushSubscriptionState(locale);
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
      window.removeEventListener('bb-notification-prefs-changed', onPrefsChange);
    };
  }, [locale]);

  return null;
}
