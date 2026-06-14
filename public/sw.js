const CACHE_NAME = 'blackandbrew-cache-v2';

// Add list of files to cache here.
const urlsToCache = [
  '/',
  '/ai-agent-logo.svg',
  '/images/notification-icon.png',
  '/images/notification-icon-512.png',
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

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'SET_BADGE') return;
  const count = Number(data.count) || 0;
  try {
    if (self.navigator?.setAppBadge) {
      if (count > 0) {
        void self.navigator.setAppBadge(count);
      } else if (self.navigator?.clearAppBadge) {
        void self.navigator.clearAppBadge();
      }
    }
  } catch {
    // ignore
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = event.notification?.data?.url || '/';
  const url = new URL(rawUrl, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
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
