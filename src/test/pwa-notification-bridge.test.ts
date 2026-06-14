import { describe, expect, test } from 'vitest';
import {
  buildInventoryOsNotification,
  buildSystemNotificationOptions,
  isUuidString,
  PWA_NOTIFICATION_ICON,
  PWA_NOTIFICATION_VIBRATE,
} from '@/lib/pwa-notification-bridge';

describe('pwa-notification-bridge', () => {
  test('isUuidString detects uuid values', () => {
    expect(isUuidString('918198da-d6b9-4272-9474-e28acf5e88cb')).toBe(true);
    expect(isUuidString('ทดสอบ')).toBe(false);
    expect(isUuidString(42)).toBe(false);
  });

  test('buildInventoryOsNotification prefixes body with unread count', () => {
    const single = buildInventoryOsNotification('รับเข้า: กาแฟ', 'รับ 2 · คงเหลือ: 0 → 2', 1, true);
    expect(single.title).toBe('รับเข้า: กาแฟ');
    expect(single.body).toBe('รับ 2 · คงเหลือ: 0 → 2');

    const multi = buildInventoryOsNotification(
      'คลังสินค้า: 3 การเปลี่ยนแปลง',
      'ผู้ใช้งาน แก้ไข 3 รายการ',
      5,
      true,
    );
    expect(multi.body.startsWith('[5] ')).toBe(true);
  });

  test('system notification uses square icon without badge (Android badge tints white)', () => {
    const opts = buildSystemNotificationOptions({ body: 'รับ 2 · คงเหลือ: 0 → 2' });
    expect(opts.icon).toBe(PWA_NOTIFICATION_ICON);
    expect(opts.icon).toBe('/images/notification-icon.png');
    expect(opts.badge).toBeUndefined();
  });

  test('system notification adds vibrate when device supports it', () => {
    const originalNavigator = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', {
      value: { ...originalNavigator, vibrate: () => true },
      configurable: true,
    });

    const opts = buildSystemNotificationOptions({
      body: 'รับ 2 · คงเหลือ: 0 → 2',
      enableVibrate: true,
    });
    expect(opts.vibrate).toEqual([...PWA_NOTIFICATION_VIBRATE]);

    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
  });
});
