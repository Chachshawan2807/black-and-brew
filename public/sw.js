// v19
importScripts('/pwa-assets.js');
importScripts('/notification-store.js');
importScripts('/offline-mutation-store.js');
importScripts('/pwa-badge.js');

const OFFLINE_MUTATION_SYNC_TAG = 'bb-offline-mutations';
const OFFLINE_FALLBACK_URL = '/offline.html';
const APP_SHELL_URL = '/th';

const { BRAND_ICON, BRAND_ICON_512, PUSH_NOTIFICATION_ICON, NOTIFICATION_BADGE, CACHE_VERSION, VIBRATE } = self.PWA_ASSETS;
const CACHE_NAME = `blackandbrew-cache-v${CACHE_VERSION}`;

function assetUrl(path) {
  return new URL(path, self.location.origin).href;
}

/**
 * Resolve push payload assets: icon = full-color brand mark, badge = alpha silhouette.
 * Server sends relative paths in payload.assets; SW falls back to PWA_ASSETS constants.
 */
function resolvePushAssets(payload) {
  const iconPath = payload.assets?.icon || PUSH_NOTIFICATION_ICON || BRAND_ICON;
  const badgePath = payload.assets?.badge || NOTIFICATION_BADGE;
  return {
    icon: assetUrl(iconPath),
    badge: assetUrl(badgePath),
  };
}

function buildNotificationOptions(payload, unreadCount, overrides = {}) {
  const { icon, badge } = resolvePushAssets(payload);
  return {
    body: payload.body,
    icon,
    badge,
    tag: payload.tag || 'bb-inventory',
    silent: false,
    requireInteraction: false,
    renotify: true,
    vibrate: [...VIBRATE],
    data: {
      url: payload.url || '/th/inventory',
      unreadCount,
      kind: payload.kind,
    },
    ...overrides,
  };
}

/** iOS Web Push rejects or ignores several Chromium-only notification fields. */
function isIosPushClient() {
  const ua = self.navigator?.userAgent ?? '';
  return /iPhone|iPad|iPod/i.test(ua);
}

function buildIosSafeNotificationOptions(options) {
  const safe = { ...options };
  delete safe.vibrate;
  delete safe.renotify;
  delete safe.badge;
  delete safe.requireInteraction;
  delete safe.timestamp;
  delete safe.silent;
  delete safe.actions;
  delete safe.image;
  return safe;
}

async function showPushNotification(title, options) {
  const primary = isIosPushClient() ? buildIosSafeNotificationOptions(options) : options;
  try {
    await self.registration.showNotification(title, primary);
    return;
  } catch (error) {
    console.warn('[sw] showNotification failed, retrying without mobile-only fields:', error);
  }

  try {
    await self.registration.showNotification(title, buildIosSafeNotificationOptions(options));
  } catch (error) {
    console.error('[sw] showNotification fallback failed:', error);
    throw error;
  }
}

// Add list of files to cache here.
const urlsToCache = [
  '/',
  APP_SHELL_URL,
  OFFLINE_FALLBACK_URL,
  '/pwa-assets.js',
  '/notification-store.js',
  '/offline-mutation-store.js',
  '/pwa-badge.js',
  '/ai-agent-logo.svg',
  BRAND_ICON,
  BRAND_ICON_512,
  PUSH_NOTIFICATION_ICON,
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
    return Math.floor(payload.unreadCount);
  }
  if (self.BBNotificationStore?.getUnreadCount) {
    const current = await self.BBNotificationStore.getUnreadCount();
    return current + 1;
  }
  return 1;
}

async function safeResolveUnreadCount(payload) {
  try {
    return await resolveUnreadCount(payload);
  } catch (error) {
    console.warn('[sw] notification store unavailable:', error);
    return typeof payload.unreadCount === 'number' && payload.unreadCount > 0
      ? Math.floor(payload.unreadCount)
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
      const isBeanDelivered = payload.kind === 'bean_order_delivered';

      if (isDailyReport || isBeanDelivered) {
        const unreadCount = await safeResolveUnreadCount(payload);

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

        await showPushNotification(payload.title, buildNotificationOptions(payload, unreadCount, {
          tag: `${payload.tag || (isBeanDelivered ? 'bb-bean-delivered' : 'bb-daily-report')}-${Date.now()}`,
          requireInteraction: true,
          timestamp: Date.now(),
          data: {
            url: payload.url || (isBeanDelivered ? '/th/bean-orders' : '/th/schedule'),
            kind: payload.kind,
            unreadCount,
          },
        }));
        await applyHomeScreenBadge(unreadCount);
        return;
      }

      const unreadCount = await safeResolveUnreadCount(payload);
      const options = buildNotificationOptions(payload, unreadCount);

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

      await showPushNotification(payload.title, options);
      await applyHomeScreenBadge(unreadCount);
    })(),
  );
});

async function notifyClientsToFlushOfflineMutations() {
  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  for (const client of windowClients) {
    client.postMessage({ type: 'FLUSH_OFFLINE_MUTATIONS' });
  }
  return windowClients.length > 0;
}

async function replayOfflineMutationFromSw(mutation) {
  const response = await fetch('/api/inventory/offline-mutation', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mutation),
  });
  if (!response.ok) {
    throw new Error(`offline replay failed: ${response.status}`);
  }
}

async function flushOfflineMutationsFromSw() {
  if (!self.BBOfflineMutationStore) return;

  const hasClients = await notifyClientsToFlushOfflineMutations();
  if (hasClients) return;

  while (true) {
    const mutation = await self.BBOfflineMutationStore.peekMutation();
    if (!mutation) break;
    try {
      await replayOfflineMutationFromSw(mutation);
      await self.BBOfflineMutationStore.removeMutation(mutation.id);
    } catch (error) {
      console.warn('[sw] offline mutation flush stopped:', error);
      break;
    }
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag !== OFFLINE_MUTATION_SYNC_TAG) return;
  event.waitUntil(flushOfflineMutationsFromSw());
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;
  if (data.type === 'SET_BADGE') {
    const count = Number(data.count) || 0;
    event.waitUntil(applyHomeScreenBadge(count));
    return;
  }
  if (data.type === 'FLUSH_OFFLINE_MUTATIONS') {
    event.waitUntil(flushOfflineMutationsFromSw());
  }
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
  const requestUrl = event.request.url;
  if (!requestUrl.startsWith('http:') && !requestUrl.startsWith('https:')) return;
  if (event.request.method !== 'GET' || requestUrl.includes('/api/')) return;

  const isNavigation = event.request.mode === 'navigate';
  const isImmutableAsset =
    requestUrl.includes('/_next/static/') ||
    requestUrl.includes('/images/') ||
    requestUrl.endsWith('.woff2') ||
    requestUrl.includes('/pwa-') ||
    requestUrl.includes('/notification-') ||
    requestUrl.includes('/ai-agent-logo.svg');

  if (!isNavigation && isImmutableAsset) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  event.respondWith(networkFirstWithOfflineFallback(event.request));
});

function shouldCacheResponse(request, response) {
  if (!response || response.status !== 200 || response.type !== 'basic') return false;
  if (request.mode === 'navigate' || request.destination === 'document') return false;
  if (request.url.includes('/api/')) return false;
  return request.url.startsWith('http:') || request.url.startsWith('https:');
}

async function resolveNavigationCacheFallback(request) {
  const exactMatch = await caches.match(request);
  if (exactMatch) return exactMatch;
  return resolveOfflineNavigationFallback();
}

function staleWhileRevalidate(request) {
  return caches.open(CACHE_NAME).then(async (cache) => {
    const cached = await cache.match(request);
    const networkPromise = fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          cache.put(request, response.clone());
        }
        return response;
      })
      .catch(() => null);

    if (cached) {
      void networkPromise;
      return cached;
    }

    const network = await networkPromise;
    return network || caches.match(request);
  });
}

async function resolveOfflineNavigationFallback() {
  const cache = await caches.open(CACHE_NAME);
  const offlinePage = await cache.match(OFFLINE_FALLBACK_URL);
  if (offlinePage) return offlinePage;
  const appShell = await cache.match(APP_SHELL_URL);
  if (appShell) return appShell;
  return cache.match('/');
}

function networkFirstWithOfflineFallback(request) {
  return fetch(request)
    .then((response) => {
      if (!response || response.status !== 200 || response.type !== 'basic') {
        return response;
      }
      if (shouldCacheResponse(request, response)) {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
      }
      return response;
    })
    .catch(async () => {
      if (request.mode === 'navigate') {
        const fallback = await resolveNavigationCacheFallback(request);
        if (fallback) return fallback;
      }

      const cached = await caches.match(request);
      if (cached) return cached;
      return caches.match(request);
    });
}
