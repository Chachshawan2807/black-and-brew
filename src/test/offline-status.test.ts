import { describe, expect, test } from 'vitest';
import {
  OFFLINE_STATUS_CHANGED_EVENT,
  resolveOfflineBannerView,
  type OfflineStatusSnapshot,
} from '@/lib/offline-status';

function snapshot(overrides: Partial<OfflineStatusSnapshot> = {}): OfflineStatusSnapshot {
  return {
    isOnline: true,
    pendingCount: 0,
    isSyncing: false,
    lastSyncError: null,
    ...overrides,
  };
}

describe('offline-status', () => {
  test('exports stable status changed event name', () => {
    expect(OFFLINE_STATUS_CHANGED_EVENT).toBe('bb-offline-status-changed');
  });

  test('hides banner when online with empty queue and no error', () => {
    expect(resolveOfflineBannerView(snapshot(), 'th')).toEqual({ visible: false });
  });

  test('shows offline guidance when disconnected', () => {
    const view = resolveOfflineBannerView(snapshot({ isOnline: false }), 'th');
    expect(view.visible).toBe(true);
    if (!view.visible) return;
    expect(view.variant).toBe('offline');
    expect(view.message).toContain('ไม่มีการเชื่อมต่อ');
    expect(view.message).toContain('ซิงก์');
  });

  test('shows pending count while offline', () => {
    const view = resolveOfflineBannerView(
      snapshot({ isOnline: false, pendingCount: 3 }),
      'en',
    );
    expect(view.visible).toBe(true);
    if (!view.visible) return;
    expect(view.variant).toBe('offline');
    expect(view.message).toContain('3');
    expect(view.message).toMatch(/change/i);
  });

  test('shows syncing state when replay is in flight', () => {
    const view = resolveOfflineBannerView(
      snapshot({ pendingCount: 2, isSyncing: true }),
      'th',
    );
    expect(view.visible).toBe(true);
    if (!view.visible) return;
    expect(view.variant).toBe('syncing');
    expect(view.message).toContain('กำลังซิงก์');
    expect(view.message).toContain('2');
  });

  test('shows retry affordance when online with pending queue', () => {
    const view = resolveOfflineBannerView(
      snapshot({ pendingCount: 1, isSyncing: false }),
      'en',
    );
    expect(view.visible).toBe(true);
    if (!view.visible) return;
    expect(view.variant).toBe('pending');
    expect(view.actionLabel).toBe('Retry');
  });

  test('shows error state when last sync failed with remaining queue', () => {
    const view = resolveOfflineBannerView(
      snapshot({
        pendingCount: 2,
        lastSyncError: 'offline replay failed: 503',
      }),
      'th',
    );
    expect(view.visible).toBe(true);
    if (!view.visible) return;
    expect(view.variant).toBe('error');
    expect(view.message).toContain('ซิงก์ไม่สำเร็จ');
    expect(view.actionLabel).toBe('ลองอีกครั้ง');
  });
});
