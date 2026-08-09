'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { navigateWithoutViewTransition } from '@/lib/view-transition';
import { readNotificationState } from '@/lib/notification-sync';
import { loadNotificationPreferences, ensureFullNotificationPreferencesOnAuth } from '@/lib/notification-preferences';
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
  unregisterOrphanedServiceWorkersInDev,
} from '@/lib/pwa-update';
import { resolveSameOriginNavigationUrl } from '@/lib/safe-navigation-url';
import { scheduleIdleWork } from '@/lib/schedule-idle-work';

export default function PwaRegister() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'th';

  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    const removeOfflineListeners = installOfflineMutationListeners();
    let cancelIdle: (() => void) | null = null;
    let removeSwUpdateListener: (() => void) | null = null;
    let onNotificationClick: ((event: MessageEvent) => void) | null = null;
    let onResume: (() => void) | null = null;

    if (!canRegisterServiceWorker()) {
      void unregisterOrphanedServiceWorkersInDev();
    } else if ('serviceWorker' in navigator) {
      const syncBadgeFromStorage = () => {
        void readNotificationState().then(({ unreadCount }) => {
          void syncAppBadge(unreadCount);
        });
      };

      onNotificationClick = (event: MessageEvent) => {
        const data = event.data as { type?: string; url?: string } | undefined;
        if (data?.type !== 'NOTIFICATION_CLICK' || !data.url) return;

        const safeUrl = resolveSameOriginNavigationUrl(data.url, window.location.origin);
        if (!safeUrl) {
          console.warn('[PwaRegister] blocked cross-origin notification navigation:', data.url);
          return;
        }

        syncBadgeFromStorage();
        navigateWithoutViewTransition(router.push, safeUrl);
      };

      onResume = () => {
        if (document.visibilityState !== 'visible') return;
        ensureFullNotificationPreferencesOnAuth();
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

      removeSwUpdateListener = installServiceWorkerUpdateListener();

      cancelIdle = scheduleIdleWork(
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
    }

    return () => {
      cancelIdle?.();
      if (onNotificationClick) {
        navigator.serviceWorker.removeEventListener('message', onNotificationClick);
      }
      if (onResume) {
        document.removeEventListener('visibilitychange', onResume);
        window.removeEventListener('focus', onResume);
        window.removeEventListener('pageshow', onResume);
        window.removeEventListener('bb-pin-authenticated', onResume);
        window.removeEventListener('bb-notification-prefs-changed', onResume);
      }
      removeOfflineListeners();
      removeSwUpdateListener?.();
    };
  }, [locale, router]);

  return null;
}
