/**
 * Intent-based preload for heavy route client chunks.
 * Call from nav hover/focus/touch before navigation.
 */
const preloaded = new Set<string>();

const ROUTE_PRELOADERS: Record<string, () => Promise<unknown>> = {
  inventory: () => import('@/app/[locale]/inventory/InventoryClient'),
  schedule: () => import('@/app/[locale]/schedule/ScheduleClient'),
  sales: () => import('@/app/[locale]/sales/SalesClient'),
  'bean-orders': () => import('@/app/[locale]/bean-orders/BeanOrdersClient'),
  'bean-order-detail': () => import('@/app/[locale]/bean-orders/BeanOrderDetailClient'),
  maintenance: () => import('@/app/[locale]/maintenance/MaintenanceClient'),
  dashboard: () => import('@/app/[locale]/dashboard/_components/LiveShiftList'),
  settings: () => import('@/app/[locale]/settings/_components/NotificationPreferencesSection'),
};

/** Routes staff open most often — warmed on idle after first paint. */
const COMMON_ROUTE_KEYS = ['inventory', 'schedule', 'dashboard'] as const;

function routeKeyFromHref(href: string): string | null {
  if (/\/bean-orders\/[^/]+$/.test(href.split(/[?#]/)[0])) return 'bean-order-detail';
  if (href.includes('/bean-orders')) return 'bean-orders';
  const segments = href.split('/').filter(Boolean);
  const segment = segments[segments.length - 1];
  if (!segment) return null;
  return segment in ROUTE_PRELOADERS ? segment : null;
}

export function preloadRouteChunk(href: string): void {
  if (typeof window === 'undefined') return;
  const key = routeKeyFromHref(href);
  if (!key || preloaded.has(key)) return;
  preloaded.add(key);
  void ROUTE_PRELOADERS[key]();
}

export function preloadCommonRouteChunks(): void {
  for (const key of COMMON_ROUTE_KEYS) {
    if (preloaded.has(key)) continue;
    preloaded.add(key);
    void ROUTE_PRELOADERS[key]();
  }
}

export function resetRouteChunkPreloadForTests(): void {
  preloaded.clear();
}
