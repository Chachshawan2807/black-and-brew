/** TrackingMore pushes updates to POST /api/bean-orders/tracking-webhook when configured. */
export function isTrackingWebhookPrimary(): boolean {
  return Boolean(process.env.TRACKING_WEBHOOK_SECRET?.trim());
}

export function resolveTrackingWebhookUrl(siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, '');
  return `${base}/api/bean-orders/tracking-webhook`;
}

export type BeanOrderTrackingSyncMode = 'stale' | 'open';

/**
 * - `stale` (default): null / pending / notfound only — lightweight list-page refresh
 * - `open`: every shipment with a tracking number that is not yet delivered (hourly cron)
 * - `full`: alias for `open` (backward compatible)
 */
export function resolveTrackingSyncMode(searchParams: URLSearchParams): BeanOrderTrackingSyncMode {
  const mode = searchParams.get('mode');
  if (mode === 'open' || mode === 'full') return 'open';
  return 'stale';
}
