import { describe, expect, test } from 'vitest';
import {
  buildInventoryOsNotification,
  buildSystemNotificationOptions,
  isBenignPushRegistrationError,
  isUuidString,
  PWA_NOTIFICATION_BADGE,
  PWA_NOTIFICATION_ICON,
  PWA_NOTIFICATION_VIBRATE,
} from '@/lib/pwa-notification-bridge';

describe('pwa-notification-bridge', () => {
  test('isUuidString detects uuid values', () => {
    expect(isUuidString('918198da-d6b9-4272-9474-e28acf5e88cb')).toBe(true);
    expect(isUuidString('ทดสอบ')).toBe(false);
    expect(isUuidString(42)).toBe(false);
  });

  test('buildInventoryOsNotification keeps stock title and body separate on Android', () => {
    const single = buildInventoryOsNotification(
      '+ เมล็ดกาแฟคั่วอ่อน',
      '+2 คงเหลือ 2',
      1,
      true,
    );
    expect(single.title).toBe('+ เมล็ดกาแฟคั่วอ่อน');
    expect(single.body).toBe('+2 คงเหลือ 2');

    const multi = buildInventoryOsNotification(
      '+ นมอัลมอนด์',
      '+3 คงเหลือ 6',
      5,
      true,
    );
    expect(multi.title).toBe('[5] + นมอัลมอนด์');
    expect(multi.body).toBe('[5] +3 คงเหลือ 6');
  });

  test('buildInventoryOsNotification merges stock lines into title on iOS so byline sits at bottom', () => {
    const single = buildInventoryOsNotification(
      '+ เมล็ดกาแฟคั่วอ่อน',
      '+2 คงเหลือ 2',
      1,
      true,
      { isIos: true },
    );
    expect(single.title).toBe('+ เมล็ดกาแฟคั่วอ่อน\n+2 คงเหลือ 2');
    expect(single.body).toBe('');

    const multi = buildInventoryOsNotification(
      '+ นมอัลมอนด์',
      '+3 คงเหลือ 6',
      5,
      true,
      { isIos: true },
    );
    expect(multi.title).toBe('[5] + นมอัลมอนด์\n[5] +3 คงเหลือ 6');
    expect(multi.body).toBe('');
  });

  test('buildInventoryOsNotification truncates long merged titles', () => {
    const longTitle = 'A'.repeat(200);
    const longSummary = 'B'.repeat(200);
    const result = buildInventoryOsNotification(longTitle, longSummary, 1, true);
    expect(result.title.length).toBeLessThanOrEqual(120);
    expect(result.body).toBe('');
  });

  test('buildInventoryOsNotification truncates long iOS stock merge', () => {
    const longItem = 'ก'.repeat(100);
    const result = buildInventoryOsNotification(
      `+ ${longItem}`,
      `+2 คงเหลือ ${longItem}`,
      1,
      true,
      { isIos: true },
    );
    expect(result.title.length).toBeLessThanOrEqual(240);
    expect(result.body).toBe('');
  });

  test('buildInventoryOsNotification merges non-stock notifications into title', () => {
    const daily = buildInventoryOsNotification(
      'ตารางงานพรุ่งนี้',
      '21-06-2026 · นิต้า 6:30',
      1,
      true,
    );
    expect(daily.title).toBe('ตารางงานพรุ่งนี้ · 21-06-2026 · นิต้า 6:30');
    expect(daily.body).toBe('');
  });

  test('system notification uses brand icon and separate mobile badge mask', () => {
    const opts = buildSystemNotificationOptions({ body: '+2 คงเหลือ 2' });
    expect(opts.icon).toContain(PWA_NOTIFICATION_ICON);
    expect(opts.badge).toContain(PWA_NOTIFICATION_BADGE);
    expect(opts.badge).not.toBe(opts.icon);
    expect(opts.icon).toMatch(/^https?:\/\//);
    expect(opts.badge).toMatch(/^https?:\/\//);
  });

  test('isBenignPushRegistrationError treats unavailable push service as expected', () => {
    expect(
      isBenignPushRegistrationError(
        new DOMException('Registration failed - push service not available', 'AbortError'),
      ),
    ).toBe(true);
    expect(isBenignPushRegistrationError(new Error('network down'))).toBe(false);
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
