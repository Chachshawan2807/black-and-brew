/**
 * Intent-based preload for heavy route client chunks.
 * Call from nav hover/focus before navigation.
 */
const preloaded = new Set<string>();

const ROUTE_PRELOADERS: Record<string, () => Promise<unknown>> = {
  inventory: () => import('@/app/[locale]/inventory/InventoryClient'),
  schedule: () => import('@/app/[locale]/schedule/ScheduleClient'),
  sales: () => import('@/app/[locale]/sales/SalesClient'),
  maintenance: () => import('@/app/[locale]/maintenance/MaintenanceClient'),
  dashboard: () => import('@/app/[locale]/dashboard/_components/LiveShiftList'),
};

function routeKeyFromHref(href: string): string | null {
  const segment = href.split('/').filter(Boolean).pop();
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
