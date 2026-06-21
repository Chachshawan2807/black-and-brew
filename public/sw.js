// v13
importScripts('/pwa-assets.js');
importScripts('/notification-store.js');
importScripts('/pwa-badge.js');

const { BRAND_ICON, BRAND_ICON_512, NOTIFICATION_BADGE, CACHE_VERSION, VIBRATE } = self.PWA_ASSETS;
const CACHE_NAME = `blackandbrew-cache-v${CACHE_VERSION}`;

function assetUrl(path) {
  return new URL(path, self.location.origin).href;
}

// Add list of files to cache here.
const urlsToCache = [
  '/',
  '/pwa-assets.js',
  '/notification-store.js',
  '/pwa-badge.js',
  '/ai-agent-logo.svg',
  BRAND_ICON,
  BRAND_ICON_512,
  NOTIFICATION_BADGE,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Cache busting: remove old caches when the CACHE_NAME changes
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

async function applyHomeScreenBadge(count) {
  if (self.BBAppBadge?.applyAppBadgeCount) {
    return self.BBAppBadge.applyAppBadgeCount(count);
  }
  if (!self.navigator?.setAppBadge) return false;
  const safe = Math.max(0, Math.min(99, Math.floor(Number(count) || 0)));
  try {
    if (safe > 0) await self.navigator.setAppBadge(safe);
    else if (self.navigator.clearAppBadge) await self.navigator.clearAppBadge();
    return true;
  } catch {
    return false;
  }
}

async function resolveUnreadCount(payload) {
  if (payload.notification && self.BBNotificationStore) {
    const result = await self.BBNotificationStore.prependNotification(payload.notification);
    return result.unreadCount;
  }
  if (typeof payload.unreadCount === 'number' && payload.unreadCount > 0) {
    return Math.min(99, Math.floor(payload.unreadCount));
  }
  if (self.BBNotificationStore?.getUnreadCount) {
    const current = await self.BBNotificationStore.getUnreadCount();
    return Math.min(99, current + 1);
  }
  return 1;
}

async function safeResolveUnreadCount(payload) {
  try {
    return await resolveUnreadCount(payload);
  } catch (error) {
    console.warn('[sw] notification store unavailable:', error);
    return typeof payload.unreadCount === 'number' && payload.unreadCount > 0
      ? Math.min(99, Math.floor(payload.unreadCount))
      : 1;
  }
}

self.addEventListener('push', (event) => {
  let payload = {
    title: 'BLACKANDBREW',
    body: 'มีการเปลี่ยนแปลงคลังสินค้า',
    tag: 'bb-inventory',
    url: '/th/inventory',
    notification: null,
    unreadCount: null,
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    }
  } catch {
    // use defaults
  }

  event.waitUntil(
    (async () => {
      const isDailyReport = payload.kind === 'daily_report';

      if (isDailyReport) {
        const unreadCount = await safeResolveUnreadCount(payload);
        const brandIcon = assetUrl(BRAND_ICON);
        const notificationBadge = assetUrl(NOTIFICATION_BADGE);

        const windowClients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });

        for (const client of windowClients) {
          client.postMessage({
            type: 'INVENTORY_PUSH_RECEIVED',
            notification: payload.notification,
            unreadCount,
            systemNotificationShown: true,
          });
        }

        await self.registration.showNotification(payload.title, {
          body: payload.body,
          icon: brandIcon,
          badge: notificationBadge,
          tag: `${payload.tag || 'bb-daily-report'}-${Date.now()}`,
          silent: false,
          requireInteraction: true,
          renotify: true,
          vibrate: [...VIBRATE],
          timestamp: Date.now(),
          data: {
            url: payload.url || '/th/schedule',
            kind: 'daily_report',
            unreadCount,
          },
        });
        await applyHomeScreenBadge(unreadCount);
        return;
      }

      const unreadCount = await safeResolveUnreadCount(payload);

      const brandIcon = assetUrl(BRAND_ICON);
      const notificationBadge = assetUrl(NOTIFICATION_BADGE);
      const options = {
        body: payload.body,
        icon: brandIcon,
        badge: notificationBadge,
        tag: payload.tag || 'bb-inventory',
        silent: false,
        requireInteraction: false,
        renotify: true,
        vibrate: [...VIBRATE],
        data: {
          url: payload.url || '/th/inventory',
          unreadCount,
        },
      };

      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        client.postMessage({
          type: 'INVENTORY_PUSH_RECEIVED',
          notification: payload.notification,
          unreadCount,
          systemNotificationShown: true,
        });
      }

      await self.registration.showNotification(payload.title, options);
      await applyHomeScreenBadge(unreadCount);
    })(),
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'SET_BADGE') return;
  const count = Number(data.count) || 0;
  event.waitUntil(applyHomeScreenBadge(count));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = event.notification?.data?.url || '/';
  const url = new URL(rawUrl, self.location.origin).href;
  event.waitUntil(
    (async () => {
      let unread = event.notification?.data?.unreadCount;
      if (typeof unread !== 'number' && self.BBNotificationStore?.getUnreadCount) {
        unread = await self.BBNotificationStore.getUnreadCount();
      }
      if (typeof unread === 'number') {
        await applyHomeScreenBadge(unread);
      }

      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of windowClients) {
        if ('focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  // Guard: only handle http: and https: requests — skip chrome-extension://, data:, etc.
  const requestUrl = event.request.url;
  if (!requestUrl.startsWith('http:') && !requestUrl.startsWith('https:')) return;

  // Use Network-First strategy to ensure fresh data, fallback to cache if offline
  if (event.request.method === 'GET' && !event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If response is valid, clone it and cache it
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          // Inner guard: never cache non-HTTP/HTTPS requests (e.g. chrome-extension://)
          if (event.request.url.startsWith('http:') || event.request.url.startsWith('https:')) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails (offline mode)
          return caches.match(event.request);
        })
    );
  }
});
