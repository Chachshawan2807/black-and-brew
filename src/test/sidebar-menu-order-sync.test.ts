import { describe, expect, test } from 'vitest';

import {
  areSidebarMenuOrdersEqual,
  resolveInitialSidebarMenuOrder,
  shouldApplyRemoteSidebarMenuOrder,
} from '@/lib/sidebar-menu-order-sync';

describe('sidebar menu order sync', () => {
  test('areSidebarMenuOrdersEqual treats null and empty as equivalent', () => {
    expect(areSidebarMenuOrdersEqual(null, null)).toBe(true);
    expect(areSidebarMenuOrdersEqual([], null)).toBe(true);
    expect(areSidebarMenuOrdersEqual(null, [])).toBe(true);
  });

  test('areSidebarMenuOrdersEqual compares order-sensitive ids', () => {
    expect(areSidebarMenuOrdersEqual(['home', 'bean-orders'], ['home', 'bean-orders'])).toBe(true);
    expect(areSidebarMenuOrdersEqual(['home', 'bean-orders'], ['bean-orders', 'home'])).toBe(false);
  });

  test('resolveInitialSidebarMenuOrder prefers server when present', () => {
    expect(
      resolveInitialSidebarMenuOrder({
        localOrderIds: ['inventory', 'home'],
        serverOrderIds: ['bean-orders', 'home'],
      }),
    ).toEqual({ orderIds: ['bean-orders', 'home'], shouldPushLocalToServer: false });
  });

  test('resolveInitialSidebarMenuOrder migrates local-only order to server', () => {
    expect(
      resolveInitialSidebarMenuOrder({
        localOrderIds: ['inventory', 'home'],
        serverOrderIds: null,
      }),
    ).toEqual({ orderIds: ['inventory', 'home'], shouldPushLocalToServer: true });
  });

  test('shouldApplyRemoteSidebarMenuOrder skips identical payloads', () => {
    expect(
      shouldApplyRemoteSidebarMenuOrder({
        currentOrderIds: ['home', 'bean-orders'],
        remoteOrderIds: ['home', 'bean-orders'],
        remoteUpdatedAt: '2026-07-24T00:00:00.000Z',
        lastAppliedUpdatedAt: '2026-07-24T00:00:00.000Z',
      }),
    ).toBe(false);
  });

  test('shouldApplyRemoteSidebarMenuOrder applies newer remote order', () => {
    expect(
      shouldApplyRemoteSidebarMenuOrder({
        currentOrderIds: ['home', 'bean-orders'],
        remoteOrderIds: ['bean-orders', 'home'],
        remoteUpdatedAt: '2026-07-24T01:00:00.000Z',
        lastAppliedUpdatedAt: '2026-07-24T00:00:00.000Z',
      }),
    ).toBe(true);
  });
});
