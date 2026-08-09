/** TrackingMore pushes updates to POST /api/bean-orders/tracking-webhook when configured. */
export function isTrackingWebhookPrimary(): boolean {
  return Boolean(process.env.TRACKING_WEBHOOK_SECRET?.trim());
}

export function resolveTrackingWebhookUrl(siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, '');
  return `${base}/api/bean-orders/tracking-webhook`;
}

/** Default: stale-only fallback. Use mode=full for a manual full resync. */
export function resolveTrackingSyncMode(searchParams: URLSearchParams): 'stale' | 'full' {
  return searchParams.get('mode') === 'full' ? 'full' : 'stale';
}
