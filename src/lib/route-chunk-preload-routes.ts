/**
 * Production-only route chunk map.
 * Kept out of the dev module graph so opening one page does not compile every feature.
 */
const ROUTE_PRELOADERS: Record<string, () => Promise<unknown>> = {
  inventory: () => import('@/app/[locale]/inventory/InventoryClient'),
  schedule: () => import('@/app/[locale]/schedule/ScheduleClient'),
  'bean-orders': () => import('@/app/[locale]/bean-orders/BeanOrdersClient'),
  'bean-order-detail': () => import('@/app/[locale]/bean-orders/BeanOrderDetailClient'),
  maintenance: () => import('@/app/[locale]/maintenance/MaintenanceClient'),
  dashboard: () => import('@/app/[locale]/dashboard/_components/LiveShiftList'),
  home: () => import('@/app/[locale]/home/HomeClient'),
  settings: () => import('@/lib/settings-chunk-preload').then((m) => {
    m.preloadSettingsSection('pageSections');
    m.preloadSettingsSection('notifications');
  }),
};

export function preloadRouteKey(key: string): void {
  const load = ROUTE_PRELOADERS[key];
  if (!load) return;
  void load();
}
