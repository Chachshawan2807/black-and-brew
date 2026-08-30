'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
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
import { scheduleIdleWork } from '@/lib/schedule-idle-work';

export default function PwaRegister() {
  const params = useParams();
  const locale = (params?.locale as string) || 'th';

  useEffect(() => {
    if (typeof navigator === 'undefined') return;

    const removeOfflineListeners = installOfflineMutationListeners();
    let cancelIdle: (() => void) | null = null;
    let removeSwUpdateListener: (() => void) | null = null;
    let onNotificationClick: ((event: MessageEvent) => void) | null = null;
    let onResume: (() => void) | null = null;
    let onPrefsChanged: (() => void) | null = null;

    if (!canRegisterServiceWorker()) {
      void unregisterOrphanedServiceWorkersInDev();
    } else if ('serviceWorker' in navigator) {
      const syncBadgeFromStorage = () => {
        void readNotificationState().then(({ unreadCount }) => {
          void syncAppBadge(unreadCount);
        });
      };

      onNotificationClick = (event: MessageEvent) => {
        const data = event.data as { type?: string } | undefined;
        if (data?.type !== 'NOTIFICATION_CLICK') return;
        syncBadgeFromStorage();
      };

      onResume = () => {
        if (document.visibilityState !== 'visible') return;
        ensureFullNotificationPreferencesOnAuth();
        syncBadgeFromStorage();
        void checkForServiceWorkerUpdate();
        schedulePushSubscriptionMaintenance(locale);
      };

      // Prefs-changed must NOT call ensureFull that function saves prefs and
      // re-dispatches this event (infinite recursion / Maximum call stack).
      onPrefsChanged = () => {
        syncBadgeFromStorage();
        schedulePushSubscriptionMaintenance(locale);
      };

      navigator.serviceWorker.addEventListener('message', onNotificationClick);
      document.addEventListener('visibilitychange', onResume);
      window.addEventListener('focus', onResume);
      window.addEventListener('pageshow', onResume);
      window.addEventListener('bb-pin-authenticated', onResume);
      window.addEventListener('bb-notification-prefs-changed', onPrefsChanged);

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
        { timeout: 500 },
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
      }
      if (onPrefsChanged) {
        window.removeEventListener('bb-notification-prefs-changed', onPrefsChanged);
      }
      removeOfflineListeners();
      removeSwUpdateListener?.();
    };
  }, [locale]);

  return null;
}
