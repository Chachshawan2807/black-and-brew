import { beforeEach, describe, expect, test } from 'vitest';
import {
  beginMobileBackLayerMount,
  claimMobileBackHistoryEntry,
  createMobileBackHistoryState,
  isCurrentMobileBackLayerMount,
  readMobileBackLayerId,
  releaseMobileBackHistoryEntry,
  resetMobileBackLayerRuntimeForTests,
  shouldDismissMobileBackLayerOnPopState,
  shouldInterceptMobileBackHistory,
  shouldPopHistoryOnOrphanUnmount,
  shouldSyncHistoryOnLayerClose,
  preserveClaimedMobileBackOnReplace,
} from '@/lib/mobile-back-layer';

describe('mobile-back-layer', () => {
  beforeEach(() => {
    resetMobileBackLayerRuntimeForTests();
  });

  test('createMobileBackHistoryState tags history with layer id', () => {
    expect(createMobileBackHistoryState('notification-panel')).toEqual({
      bbMobileBack: 'notification-panel',
    });
  });

  test('createMobileBackHistoryState keeps existing router history fields', () => {
    expect(
      createMobileBackHistoryState('home-overlay', { __na: 'router-tree', idx: 3 }),
    ).toEqual({
      __na: 'router-tree',
      idx: 3,
      bbMobileBack: 'home-overlay',
    });
  });

  test('readMobileBackLayerId returns null for unrelated history state', () => {
    expect(readMobileBackLayerId(null)).toBeNull();
    expect(readMobileBackLayerId({ other: true })).toBeNull();
    expect(readMobileBackLayerId({ bbMobileBack: 'unknown' })).toBeNull();
  });

  test('shouldSyncHistoryOnLayerClose skips sync when dismissed by gesture', () => {
    expect(
      shouldSyncHistoryOnLayerClose(
        true,
        createMobileBackHistoryState('mobile-nav-drawer'),
        'mobile-nav-drawer',
      ),
    ).toBe(false);
  });

  test('shouldSyncHistoryOnLayerClose skips sync when closing for route navigation', () => {
    expect(
      shouldSyncHistoryOnLayerClose(
        false,
        createMobileBackHistoryState('mobile-nav-drawer'),
        'mobile-nav-drawer',
        true,
      ),
    ).toBe(false);
  });

  test('shouldSyncHistoryOnLayerClose syncs when UI closed matching layer state', () => {
    expect(
      shouldSyncHistoryOnLayerClose(
        false,
        createMobileBackHistoryState('quick-action-overlay'),
        'quick-action-overlay',
      ),
    ).toBe(true);
  });

  test('shouldSyncHistoryOnLayerClose ignores stale history state from another layer', () => {
    expect(
      shouldSyncHistoryOnLayerClose(
        false,
        createMobileBackHistoryState('notification-panel'),
        'mobile-nav-drawer',
      ),
    ).toBe(false);
  });

  test('shouldSyncHistoryOnLayerClose skips sync when the overlay is still active', () => {
    expect(
      shouldSyncHistoryOnLayerClose(
        false,
        createMobileBackHistoryState('home-overlay'),
        'home-overlay',
        false,
        true,
      ),
    ).toBe(false);
  });

  test('shouldDismissMobileBackLayerOnPopState dismisses when history no longer tags this layer', () => {
    expect(
      shouldDismissMobileBackLayerOnPopState(
        'quick-action-overlay',
        createMobileBackHistoryState('notification-panel'),
      ),
    ).toBe(true);
    expect(shouldDismissMobileBackLayerOnPopState('quick-action-overlay', null)).toBe(true);
  });

  test('shouldDismissMobileBackLayerOnPopState keeps layer when child overlay closed above', () => {
    expect(
      shouldDismissMobileBackLayerOnPopState(
        'notification-panel',
        createMobileBackHistoryState('notification-panel'),
      ),
    ).toBe(false);
  });

  test('shouldDismissMobileBackLayerOnPopState keeps layer when router state still tags it', () => {
    expect(
      shouldDismissMobileBackLayerOnPopState(
        'home-overlay',
        createMobileBackHistoryState('home-overlay', { __na: 'router-tree' }),
      ),
    ).toBe(false);
  });

  test('shouldPopHistoryOnOrphanUnmount never auto-backs while the overlay is still wanted', () => {
    expect(shouldPopHistoryOnOrphanUnmount(true)).toBe(false);
    expect(shouldPopHistoryOnOrphanUnmount(false)).toBe(false);
  });

  test('router replaceState cannot wipe a claimed overlay tag', () => {
    claimMobileBackHistoryEntry('home-overlay');
    const current = createMobileBackHistoryState('home-overlay', { __na: 'old-tree' });
    expect(preserveClaimedMobileBackOnReplace({ __na: 'new-tree' }, current)).toEqual({
      __na: 'new-tree',
      bbMobileBack: 'home-overlay',
    });
  });

  test('router replaceState stays untouched when no overlay is claimed', () => {
    expect(preserveClaimedMobileBackOnReplace({ __na: 'new-tree' }, { __na: 'old-tree' })).toEqual({
      __na: 'new-tree',
    });
  });

  test('remount reuses the same history claim until the overlay actually closes', () => {
    const first = beginMobileBackLayerMount('home-overlay');
    expect(claimMobileBackHistoryEntry('home-overlay')).toBe(true);
    const second = beginMobileBackLayerMount('home-overlay');
    expect(isCurrentMobileBackLayerMount('home-overlay', first)).toBe(false);
    expect(isCurrentMobileBackLayerMount('home-overlay', second)).toBe(true);
    expect(claimMobileBackHistoryEntry('home-overlay')).toBe(false);
    releaseMobileBackHistoryEntry('home-overlay');
    expect(claimMobileBackHistoryEntry('home-overlay')).toBe(true);
  });

  test('shouldInterceptMobileBackHistory stays off on fine-pointer desktop', () => {
    expect(
      shouldInterceptMobileBackHistory({
        matchMedia: () => ({ matches: false }) as MediaQueryList,
      }),
    ).toBe(false);
  });

  test('shouldInterceptMobileBackHistory stays on for coarse-pointer devices', () => {
    expect(
      shouldInterceptMobileBackHistory({
        matchMedia: () => ({ matches: true }) as MediaQueryList,
      }),
    ).toBe(true);
  });
});
