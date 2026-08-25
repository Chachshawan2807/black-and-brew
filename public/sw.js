// v28
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

const NOTIFICATION_ASSET_PATHS = [
  PUSH_NOTIFICATION_ICON,
  NOTIFICATION_BADGE,
  BRAND_ICON,
  BRAND_ICON_512,
];

function normalizeAssetPath(pathOrUrl) {
  if (typeof pathOrUrl !== 'string' || !pathOrUrl.trim()) return PUSH_NOTIFICATION_ICON;
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return new URL(pathOrUrl).pathname;
  }
  return pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
}

/**
 * Cache-first: ensure push notification icon/badge are in Cache Storage before OS tray
 * tries to fetch them (avoids Android bell + letter fallback on cold SW / flaky network).
 */
async function ensureNotificationAssetCached(assetPath) {
  const path = normalizeAssetPath(assetPath);
  const url = assetUrl(path);
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(url);
    if (cached) return url;

    const response = await fetch(url);
    if (response && response.ok && response.type === 'basic') {
      await cache.put(url, response.clone());
      return url;
    }
    console.warn('[sw] notification asset fetch failed:', url, response?.status);
  } catch (error) {
    console.warn('[sw] notification asset cache failed:', url, error);
  }
  return url;
}

async function warmNotificationAssets() {
  await Promise.all(NOTIFICATION_ASSET_PATHS.map((path) => ensureNotificationAssetCached(path)));
}

/**
 * Resolve push payload assets: icon = full-color brand mark, badge = alpha silhouette.
 * Server sends relative paths in payload.assets; SW falls back to PWA_ASSETS constants.
 */
async function resolvePushAssets(payload) {
  const iconPath = payload.assets?.icon || PUSH_NOTIFICATION_ICON || BRAND_ICON;
  const badgePath = payload.assets?.badge || NOTIFICATION_BADGE;
  const [icon, badge] = await Promise.all([
    ensureNotificationAssetCached(iconPath),
    ensureNotificationAssetCached(badgePath),
  ]);
  return { icon, badge };
}

async function buildNotificationOptions(payload, unreadCount, overrides = {}) {
  const { icon, badge } = await resolvePushAssets(payload);
  const display = resolveOsNotificationDisplay(payload);
  return {
    body: display.body,
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

/** Keep in sync with OS_NOTIFICATION_* in src/lib/pwa-notification-bridge.ts */
const OS_NOTIFICATION_TITLE_MAX = 120;
const OS_NOTIFICATION_BODY_MAX = 240;

/** Stock quick-action titles: "+ Item", "− Item", "⇄ Item", or batched "+ N รายการ". */
function isStockOperationNotificationTitle(title) {
  return /^[+−⇄]\s/u.test(String(title || '').trim());
}

function isDailyReportPayload(payload) {
  if (payload.kind === 'daily_report') return true;
  const meta = payload.notification && payload.notification.metadata;
  return meta && meta.kind === 'daily_report';
}

function readNotificationString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function resolveNotificationDetailSource(notification, trimmedSummary) {
  if (notification && typeof notification === 'object') {
    const fieldSummary = readNotificationString(notification.fieldSummary);
    if (fieldSummary) return fieldSummary;
    const notificationSummary = readNotificationString(notification.summary);
    if (notificationSummary) return notificationSummary;
  }
  return trimmedSummary;
}

function isIosPushClient() {
  return /iPhone|iPad|iPod/i.test(self.navigator?.userAgent ?? '');
}

function resolveSplitOsNotification(titleLine, detailLine) {
  const title = String(titleLine).trim().slice(0, OS_NOTIFICATION_TITLE_MAX);
  const body = String(detailLine).trim().slice(0, OS_NOTIFICATION_BODY_MAX);
  return { title, body };
}

function resolveBeanOrderCreatedOsDisplay(headline, customerLine, itemsSummary) {
  const head = String(headline).trim().slice(0, OS_NOTIFICATION_TITLE_MAX);
  const customer = String(customerLine).trim();
  const items = String(itemsSummary).trim().slice(0, OS_NOTIFICATION_BODY_MAX);

  if (isIosPushClient()) {
    const titleMerged = customer
      ? `${head}\n${customer}`.slice(0, OS_NOTIFICATION_TITLE_MAX)
      : head;
    return { title: titleMerged, body: items };
  }

  const bodyParts = [];
  if (customer) bodyParts.push(customer);
  if (items) bodyParts.push(items);
  return {
    title: head,
    body: bodyParts.join('\n').slice(0, OS_NOTIFICATION_BODY_MAX),
  };
}

/** Title + body on all platforms — iOS lock screen shows only the first title line when body is empty. */
function resolveOsNotificationDisplay(payload) {
  const notification = payload.notification;
  const logicalTitle =
    (notification && notification.title) || payload.title || '';
  const logicalSummary =
    (notification && notification.summary) || payload.body || '';
  const trimmedTitle = String(logicalTitle).trim();
  const trimmedSummary = String(logicalSummary).trim();

  if (isStockOperationNotificationTitle(trimmedTitle) && trimmedSummary) {
    const titleLine = trimmedTitle.slice(0, OS_NOTIFICATION_TITLE_MAX);
    const bodyLine = trimmedSummary.slice(0, OS_NOTIFICATION_BODY_MAX);
    return { title: titleLine, body: bodyLine };
  }

  if (payload.kind === 'bean_order_created') {
    const headline =
      readNotificationString(notification && notification.title) || trimmedTitle;
    const customerLine = readNotificationString(notification && notification.summary);
    const itemsSummary =
      readNotificationString(notification && notification.fieldSummary) || trimmedSummary;
    return resolveBeanOrderCreatedOsDisplay(headline, customerLine, itemsSummary);
  }

  if (isDailyReportPayload(payload)) {
    const fieldSummary = readNotificationString(notification && notification.fieldSummary);
    return resolveSplitOsNotification(trimmedTitle, fieldSummary || trimmedSummary);
  }

  const detailSource = resolveNotificationDetailSource(notification, trimmedSummary);
  return resolveSplitOsNotification(trimmedTitle, detailSource);
}

/** iOS Web Push rejects or ignores several Chromium-only notification fields. */
function resolvePushLocale(payload) {
  if (typeof payload.locale === 'string' && /^[a-z]{2}$/i.test(payload.locale)) {
    return payload.locale.toLowerCase();
  }
  const url = payload.url;
  if (typeof url === 'string') {
    const match = url.match(/^\/([a-z]{2})\//i);
    if (match) return match[1].toLowerCase();
  }
  return 'th';
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

/** Android retry: drop Chromium extras that can fail showNotification but keep icon + badge. */
function buildAndroidRetryNotificationOptions(options) {
  const safe = { ...options };
  delete safe.vibrate;
  delete safe.renotify;
  delete safe.requireInteraction;
  delete safe.timestamp;
  delete safe.silent;
  delete safe.actions;
  delete safe.image;
  return safe;
}

async function showPushNotification(title, options) {
  const isIos = isIosPushClient();
  const primary = isIos ? buildIosSafeNotificationOptions(options) : options;
  try {
    await self.registration.showNotification(title, primary);
    return;
  } catch (error) {
    console.warn('[sw] showNotification failed, retrying:', error);
  }

  try {
    const retry = isIos
      ? buildIosSafeNotificationOptions(options)
      : buildAndroidRetryNotificationOptions(options);
    await self.registration.showNotification(title, retry);
  } catch (error) {
    console.error('[sw] showNotification fallback failed:', error);
    throw error;
  }
}

async function hasVisibleWindowClient() {
  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  return windowClients.some(
    (client) => client.visibilityState === 'visible' && client.focused,
  );
}

/** Morning cron digests must always surface in the OS tray (iOS/Android). */
function shouldAlwaysShowOsBanner(payload) {
  return (
    payload.kind === 'daily_report' ||
    payload.kind === 'proactive_insight' ||
    payload.kind === 'security_alert'
  );
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
      .then(() => warmNotificationAssets())
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
    title: 'black & brew',
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
      const isBeanShipped = payload.kind === 'bean_order_shipped';
      const isBeanPayment = payload.kind === 'bean_order_payment_confirmed';
      const isBeanCreated = payload.kind === 'bean_order_created';
      const isBeanOrder = isBeanDelivered || isBeanShipped || isBeanPayment || isBeanCreated;
      const isInsight = payload.kind === 'proactive_insight';
      const isSecurity = payload.kind === 'security_alert';

      if (isDailyReport || isBeanOrder || isInsight || isSecurity) {
        const unreadCount = await safeResolveUnreadCount(payload);
        const appVisible = await hasVisibleWindowClient();

        const fallbackTag = isSecurity
          ? 'bb-security'
          : isInsight
            ? 'bb-insight'
            : isBeanCreated
              ? 'bb-bean-created'
              : isBeanPayment
                ? 'bb-bean-paid'
                : isBeanShipped
                  ? 'bb-bean-shipped'
                  : isBeanDelivered
                    ? 'bb-bean-delivered'
                    : 'bb-daily-report';
        const locale = resolvePushLocale(payload);
        const fallbackUrl = isSecurity
          ? `/${locale}/settings`
          : isInsight
            ? `/${locale}`
            : isBeanOrder
              ? `/${locale}/bean-orders`
              : `/${locale}/schedule`;

        const display = resolveOsNotificationDisplay(payload);
        let systemNotificationShown = false;
        if (!appVisible || shouldAlwaysShowOsBanner(payload)) {
          await showPushNotification(
            display.title,
            await buildNotificationOptions(payload, unreadCount, {
            tag: `${payload.tag || fallbackTag}-${Date.now()}`,
            requireInteraction: true,
            timestamp: Date.now(),
            data: {
              url: payload.url || fallbackUrl,
              kind: payload.kind,
              unreadCount,
            },
          }),
          );
          systemNotificationShown = true;
        }

        const windowClients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });

        for (const client of windowClients) {
          client.postMessage({
            type: 'INVENTORY_PUSH_RECEIVED',
            notification: payload.notification,
            unreadCount,
            systemNotificationShown,
          });
        }

        await applyHomeScreenBadge(unreadCount);
        return;
      }

      const unreadCount = await safeResolveUnreadCount(payload);
      const display = resolveOsNotificationDisplay(payload);
      const options = await buildNotificationOptions(payload, unreadCount, {
        tag: `${payload.tag || 'bb-inventory'}-${Date.now()}`,
      });
      const appVisible = await hasVisibleWindowClient();

      let systemNotificationShown = false;
      if (!appVisible) {
        await showPushNotification(display.title, options);
        systemNotificationShown = true;
      }

      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        client.postMessage({
          type: 'INVENTORY_PUSH_RECEIVED',
          notification: payload.notification,
          unreadCount,
          systemNotificationShown,
        });
      }

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
  const appShellUrl = new URL(APP_SHELL_URL, self.location.origin).href;
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
          client.postMessage({ type: 'NOTIFICATION_CLICK' });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(appShellUrl);
      }
    })(),
  );
});

function isLocalDevHost(hostname) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.localhost')
  );
}

/** Dev Turbopack chunks change on every HMR — never intercept them or module factories go stale. */
function shouldBypassSwFetchForDev(request) {
  const url = new URL(request.url);
  if (!isLocalDevHost(url.hostname)) return false;
  return url.pathname.includes('/_next/');
}

self.addEventListener('fetch', (event) => {
  const requestUrl = event.request.url;
  if (!requestUrl.startsWith('http:') && !requestUrl.startsWith('https:')) return;
  if (event.request.method !== 'GET' || requestUrl.includes('/api/')) return;
  if (shouldBypassSwFetchForDev(event.request)) return;

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
