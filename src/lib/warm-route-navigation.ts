import { preloadRouteChunk } from '@/lib/route-chunk-preload';

type PrefetchFn = (href: string) => void;

const ROUTER_NOT_READY_MESSAGE = 'Router action dispatched before initialization';

function safePrefetch(prefetch: PrefetchFn, href: string): void {
  try {
    prefetch(href);
  } catch (error) {
    if (error instanceof Error && error.message.includes(ROUTER_NOT_READY_MESSAGE)) {
      return;
    }
    throw error;
  }
}

/**
 * Warms both the route client chunk and the App Router RSC payload before navigation.
 */
export function warmRouteNavigation(href: string, prefetch?: PrefetchFn): void {
  if (typeof window === 'undefined') return;
  preloadRouteChunk(href);
  if (prefetch) safePrefetch(prefetch, href);
}
