'use client';

import { useEffect } from 'react';
import { countUnread, loadStoredNotifications } from '@/lib/notification-storage';
import {
  loadNotificationPreferences,
} from '@/lib/notification-preferences';
import {
  requestNotificationPermission,
  syncAppBadge,
  canRegisterServiceWorker,
} from '@/lib/pwa-notification-bridge';

export default function PwaRegister() {
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
  };
  }, []);

  return null;
}
