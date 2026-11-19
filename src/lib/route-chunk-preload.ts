/**
 * Intent-based preload for heavy route client chunks.
 * Call from nav hover/focus/touch before navigation.
 *
 * The import() map lives in `route-chunk-preload-routes.ts` and is loaded only
 * outside `next dev`. A static import() here would compile every feature into
 * the shell graph of every page.
 */
const preloaded = new Set<string>();

const ROUTE_KEYS = new Set([
  'inventory',
  'schedule',
  'bean-orders',
  'bean-order-detail',
  'maintenance',
  'dashboard',
  'home',
  'settings',
]);

/** Routes staff open most often warmed on idle after first paint. */
const COMMON_ROUTE_KEYS = ['inventory', 'schedule', 'dashboard'] as const;

function routeKeyFromHref(href: string): string | null {
  if (/\/bean-orders\/[^/]+$/.test(href.split(/[?#]/)[0])) return 'bean-order-detail';
  if (href.includes('/bean-orders')) return 'bean-orders';
  const segments = href.split('/').filter(Boolean);
  const segment = segments[segments.length - 1];
  if (!segment || !ROUTE_KEYS.has(segment)) return null;
  return segment;
}

function shouldPreloadRouteChunks(): boolean {
  // In `next dev`, each import() compiles on the one bundler thread and freezes every open page.
  return process.env.NODE_ENV !== 'development';
}

function preloadKey(key: string): void {
  if (process.env.NODE_ENV === 'development') return;
  void import('./route-chunk-preload-routes').then((mod) => mod.preloadRouteKey(key));
}

export function preloadRouteChunk(href: string): void {
  if (!shouldPreloadRouteChunks()) return;
  if (typeof window === 'undefined') return;
  const key = routeKeyFromHref(href);
  if (!key || preloaded.has(key)) return;
  preloaded.add(key);
  preloadKey(key);
}

export function preloadCommonRouteChunks(): void {
  if (!shouldPreloadRouteChunks()) return;
  for (const key of COMMON_ROUTE_KEYS) {
    if (preloaded.has(key)) continue;
    preloaded.add(key);
    preloadKey(key);
  }
}

export function resetRouteChunkPreloadForTests(): void {
  preloaded.clear();
}
