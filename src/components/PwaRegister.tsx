'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { countUnread, loadStoredNotifications } from '@/lib/notification-storage';
import {
  loadNotificationPreferences,
} from '@/lib/notification-preferences';
import {
  requestNotificationPermission,
  syncAppBadge,
  canRegisterServiceWorker,
} from '@/lib/pwa-notification-bridge';
import { ensurePushSubscription, refreshPushSubscriptionState } from '@/lib/push-subscription-client';

export default function PwaRegister() {
  const params = useParams();
  const locale = (params?.locale as string) || 'th';

  useEffect(() => {
    if (!canRegisterServiceWorker()) return;

  const syncBadgeFromStorage = () => {
    const stored = loadStoredNotifications();
    void syncAppBadge(countUnread(stored));
  };

  const onNotificationClick = (event: MessageEvent) => {
    const data = event.data as { type?: string; url?: string } | undefined;
    if (data?.type === 'NOTIFICATION_CLICK' && data.url) {
      window.location.href = data.url;
    }
  };

  navigator.serviceWorker.addEventListener('message', onNotificationClick);

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
        if (prefs.enabled && prefs.systemNotifications) {
          void requestNotificationPermission();
        }
      })
      .catch((registrationError) => {
        console.error('SW registration failed:', registrationError);
      });
  }, 1000);

  return () => {
    clearTimeout(timeout);
    navigator.serviceWorker.removeEventListener('message', onNotificationClick);
    window.removeEventListener('bb-notification-prefs-changed', onPrefsChange);
  };
  }, [locale]);

  return null;
}
