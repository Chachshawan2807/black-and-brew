import { describe, expect, test, vi, afterEach } from 'vitest';
import { NOTIFICATION_STORAGE_KEY } from '@/lib/notification-types';
import {
  isNotificationStorageKey,
  subscribeNotificationSync,
} from '@/lib/notification-cross-tab';

describe('notification-cross-tab', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('isNotificationStorageKey matches inventory storage key', () => {
    expect(isNotificationStorageKey(NOTIFICATION_STORAGE_KEY)).toBe(true);
    expect(isNotificationStorageKey('other-key')).toBe(false);
    expect(isNotificationStorageKey(null)).toBe(false);
  });

  test('subscribeNotificationSync listens to storage events for notification key', () => {
    const onSync = vi.fn();
    const cleanup = subscribeNotificationSync(onSync);

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: NOTIFICATION_STORAGE_KEY,
        newValue: '[]',
      }),
    );
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'bb-theme',
        newValue: 'dark',
      }),
    );

    expect(onSync).toHaveBeenCalledTimes(1);
    cleanup();
  });
});
