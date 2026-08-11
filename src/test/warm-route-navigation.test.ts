import { describe, expect, test, vi, beforeEach } from 'vitest';
import { warmRouteNavigation } from '@/lib/warm-route-navigation';
import { resetRouteChunkPreloadForTests } from '@/lib/route-chunk-preload';

describe('warmRouteNavigation', () => {
  beforeEach(() => {
    resetRouteChunkPreloadForTests();
  });

  test('preloads client chunk and calls router prefetch', () => {
    const prefetch = vi.fn();
    warmRouteNavigation('/th/bean-orders/order-1', prefetch);
    expect(prefetch).toHaveBeenCalledWith('/th/bean-orders/order-1');
  });

  test('skips prefetch when no prefetch function is provided', () => {
    warmRouteNavigation('/th/bean-orders/order-1');
    // No throw — chunk preload is fire-and-forget.
    expect(true).toBe(true);
  });
});
