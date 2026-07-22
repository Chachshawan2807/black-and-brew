'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { navigateWithViewTransition } from '@/lib/view-transition';
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
import { installOfflineMutationListeners } from '@/lib/offline-mutation-client';
import { PWA_SERVICE_WORKER_PATH } from '@/lib/pwa-config';
import {
  checkForServiceWorkerUpdate,
  installServiceWorkerUpdateListener,
} from '@/lib/pwa-update';
import { resolveSameOriginNavigationUrl } from '@/lib/safe-navigation-url';
import { scheduleIdleWork } from '@/lib/schedule-idle-work';

export default function PwaRegister() {
  const params = useParams();
  const router = useRouter();
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
      if (data?.type !== 'NOTIFICATION_CLICK' || !data.url) return;

      const safeUrl = resolveSameOriginNavigationUrl(data.url, window.location.origin);
      if (!safeUrl) {
        console.warn('[PwaRegister] blocked cross-origin notification navigation:', data.url);
        return;
      }

      syncBadgeFromStorage();
      navigateWithViewTransition(router.push, safeUrl);
    };

    const onResume = () => {
      if (document.visibilityState !== 'visible') return;
      syncBadgeFromStorage();
      void checkForServiceWorkerUpdate();
      schedulePushSubscriptionMaintenance(locale);
    };

    navigator.serviceWorker.addEventListener('message', onNotificationClick);
    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('focus', onResume);
    window.addEventListener('pageshow', onResume);
    window.addEventListener('bb-pin-authenticated', onResume);
    window.addEventListener('bb-notification-prefs-changed', onResume);

    const removeOfflineListeners = installOfflineMutationListeners();
    const removeSwUpdateListener = installServiceWorkerUpdateListener();

    const cancelIdle = scheduleIdleWork(
      () => {
        navigator.serviceWorker
          .register(PWA_SERVICE_WORKER_PATH, { updateViaCache: 'none' })
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
      },
      { timeout: 2000 },
    );

    return () => {
      cancelIdle();
      navigator.serviceWorker.removeEventListener('message', onNotificationClick);
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('focus', onResume);
      window.removeEventListener('pageshow', onResume);
      window.removeEventListener('bb-pin-authenticated', onResume);
      window.removeEventListener('bb-notification-prefs-changed', onResume);
      removeOfflineListeners();
      removeSwUpdateListener();
    };
  }, [locale, router]);

  return null;
}
