import { preloadRouteChunk } from '@/lib/route-chunk-preload';

type PrefetchFn = (href: string) => void;

/**
 * Warms both the route client chunk and the App Router RSC payload before navigation.
 */
export function warmRouteNavigation(href: string, prefetch?: PrefetchFn): void {
  if (typeof window === 'undefined') return;
  preloadRouteChunk(href);
  prefetch?.(href);
}
