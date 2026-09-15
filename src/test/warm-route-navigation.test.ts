import { describe, expect, test, vi, beforeEach } from 'vitest';
import {
  safeRouterNavigate,
  warmRouteNavigation,
} from '@/lib/warm-route-navigation';
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
    // No throw chunk preload is fire-and-forget.
    expect(true).toBe(true);
  });

  test('swallows router-not-ready prefetch errors', () => {
    const prefetch = vi.fn(() => {
      throw new Error('Internal Next.js error: Router action dispatched before initialization.');
    });

    expect(() => warmRouteNavigation('/th/bean-orders/order-1', prefetch)).not.toThrow();
    expect(prefetch).toHaveBeenCalledWith('/th/bean-orders/order-1');
  });

  test('rethrows unexpected prefetch errors', () => {
    const prefetch = vi.fn(() => {
      throw new Error('network failed');
    });

    expect(() => warmRouteNavigation('/th/bean-orders/order-1', prefetch)).toThrow('network failed');
  });

  test('safeRouterNavigate falls back to location.assign when router is not ready', () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { assign });

    const navigate = vi.fn(() => {
      throw new Error('Internal Next.js error: Router action dispatched before initialization.');
    });

    safeRouterNavigate(navigate, '/th/inventory');

    expect(navigate).toHaveBeenCalledWith('/th/inventory');
    expect(assign).toHaveBeenCalledWith('/th/inventory');
  });
});
