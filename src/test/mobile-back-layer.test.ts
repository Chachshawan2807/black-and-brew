import { describe, expect, test } from 'vitest';
import {
  createMobileBackHistoryState,
  readMobileBackLayerId,
  shouldSyncHistoryOnLayerClose,
} from '@/lib/mobile-back-layer';

describe('mobile-back-layer', () => {
  test('createMobileBackHistoryState tags history with layer id', () => {
    expect(createMobileBackHistoryState('notification-panel')).toEqual({
      bbMobileBack: 'notification-panel',
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
});
