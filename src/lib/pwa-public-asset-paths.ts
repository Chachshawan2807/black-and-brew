/** Root public files that must never go through locale prefix redirects (SW, PWA scripts). */

export const PUBLIC_ROOT_ASSET_PATHS = new Set([
  '/sw.js',
  '/pwa-assets.js',
  '/notification-store.js',
  '/offline-mutation-store.js',
  '/pwa-badge.js',
  '/offline.html',
  '/manifest.webmanifest',
  '/favicon.ico',
]);

export function isPublicRootAssetPath(pathname: string): boolean {
  if (PUBLIC_ROOT_ASSET_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/images/')) return true;
  if (pathname.startsWith('/pwa-')) return true;
  return false;
}
