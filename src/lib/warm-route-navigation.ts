import { preloadRouteChunk } from '@/lib/route-chunk-preload';

type PrefetchFn = (href: string) => void;
export type RouterNavigateFn = (href: string) => void;
type RouterRefreshFn = () => void;

const ROUTER_NOT_READY_MESSAGE = 'Router action dispatched before initialization';

export function isRouterNotReadyError(error: unknown): boolean {
  return error instanceof Error && error.message.includes(ROUTER_NOT_READY_MESSAGE);
}

function swallowRouterNotReady(action: () => void): void {
  try {
    action();
  } catch (error) {
    if (isRouterNotReadyError(error)) return;
    throw error;
  }
}

function safePrefetch(prefetch: PrefetchFn, href: string): void {
  swallowRouterNotReady(() => prefetch(href));
}

/** Soft navigate; falls back to a full load if the App Router queue is not ready yet. */
export function safeRouterNavigate(navigate: RouterNavigateFn, href: string): void {
  try {
    navigate(href);
  } catch (error) {
    if (isRouterNotReadyError(error)) {
      window.location.assign(href);
      return;
    }
    throw error;
  }
}

export function safeRouterRefresh(refresh: RouterRefreshFn): void {
  swallowRouterNotReady(refresh);
}

/**
 * Warms both the route client chunk and the App Router RSC payload before navigation.
 */
export function warmRouteNavigation(href: string, prefetch?: PrefetchFn): void {
  if (typeof window === 'undefined') return;
  preloadRouteChunk(href);
  if (prefetch) safePrefetch(prefetch, href);
}
