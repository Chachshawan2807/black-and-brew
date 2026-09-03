import { describe, expect, test, vi } from 'vitest';
import {
  buildInventoryOsNotification,
  buildSplitOsNotification,
  buildSystemNotificationOptions,
  canRegisterServiceWorker,
  isBenignPushRegistrationError,
  isUuidString,
  OS_NOTIFICATION_BODY_MAX,
  OS_NOTIFICATION_TITLE_MAX,
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

  test('canRegisterServiceWorker is disabled in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(canRegisterServiceWorker()).toBe(false);
    vi.unstubAllEnvs();
  });

  test('buildInventoryOsNotification keeps non-stock title and body separate on Android', () => {
    const result = buildInventoryOsNotification(
      'ชำระแล้ว',
      'คุณลี · 5,300 บาท',
      27,
      true,
    );
    expect(result.title).toBe('ชำระแล้ว');
    expect(result.body).toBe('คุณลี · 5,300 บาท');
    expect(result.title).not.toContain('[27]');
  });

  test('buildInventoryOsNotification prefers fieldSummary for non-stock body', () => {
    const insightSummary =
      'สัปดาห์นี้วันที่คนน้อย: ส. 4 คน, อา. 4 คน, จ. 3 คน ควรตรวจตารางงานค่ะ';
    const result = buildInventoryOsNotification('คนน้อย', 'สัปดาห์นี้วันที่คนน้อย…', 1, true, {
      fieldSummary: insightSummary,
    });
    expect(result.title).toBe('คนน้อย');
    expect(result.body).toBe(insightSummary);
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
    expect(multi.title).toBe('+ นมอัลมอนด์');
    expect(multi.body).toBe('+3 คงเหลือ 6');
  });

  test('buildInventoryOsNotification keeps stock title and body separate on iOS', () => {
    const single = buildInventoryOsNotification(
      '+ เมล็ดกาแฟคั่วอ่อน',
      '+2 คงเหลือ 2',
      1,
      true,
      { isIos: true },
    );
    expect(single.title).toBe('+ เมล็ดกาแฟคั่วอ่อน');
    expect(single.body).toBe('+2 คงเหลือ 2');

    const multi = buildInventoryOsNotification(
      '+ นมอัลมอนด์',
      '+3 คงเหลือ 6',
      5,
      true,
      { isIos: true },
    );
    expect(multi.title).toBe('+ นมอัลมอนด์');
    expect(multi.body).toBe('+3 คงเหลือ 6');
  });

  test('buildInventoryOsNotification truncates long non-stock body on Android', () => {
    const longTitle = 'A'.repeat(200);
    const longSummary = 'B'.repeat(300);
    const result = buildInventoryOsNotification(longTitle, longSummary, 1, true);
    expect(result.title.length).toBeLessThanOrEqual(OS_NOTIFICATION_TITLE_MAX);
    expect(result.body.length).toBe(OS_NOTIFICATION_BODY_MAX);
    expect(result.body).toBe('B'.repeat(OS_NOTIFICATION_BODY_MAX));
  });

  test('buildInventoryOsNotification truncates long stock lines on iOS', () => {
    const longItem = 'ก'.repeat(100);
    const result = buildInventoryOsNotification(
      `+ ${longItem}`,
      `+2 คงเหลือ ${longItem}`,
      1,
      true,
      { isIos: true },
    );
    expect(result.title.length).toBeLessThanOrEqual(OS_NOTIFICATION_TITLE_MAX);
    expect(result.body.length).toBeLessThanOrEqual(OS_NOTIFICATION_BODY_MAX);
    expect(result.body).not.toBe('');
  });

  test('buildInventoryOsNotification keeps non-stock title and body separate', () => {
    const daily = buildInventoryOsNotification(
      'ตารางงานพรุ่งนี้',
      '21/06/2026 · นิต้า 6:30',
      1,
      true,
    );
    expect(daily.title).toBe('ตารางงานพรุ่งนี้');
    expect(daily.body).toBe('21/06/2026 · นิต้า 6:30');
  });

  test('buildSplitOsNotification keeps headline and schedule detail separate on Android', () => {
    const scheduleBody = [
      'ตารางงาน 09/08/2026 (วันนี้) · เข้างาน 5 คน',
      'ปิ่น 6:30, มุก 7:00, นิต้า 8:00, ล่า 6:30, โบ๊ท 7:00',
      'งานอื่น: ล่า ร้านซักผ้า',
    ].join('\n');

    const android = buildSplitOsNotification('ตารางงานวันนี้', scheduleBody);
    expect(android.title).toBe('ตารางงานวันนี้');
    expect(android.body).toBe(scheduleBody.slice(0, OS_NOTIFICATION_BODY_MAX));
    expect(android.body).toContain('ปิ่น 6:30');
    expect(android.body).toContain('งานอื่น');
  });

  test('buildSplitOsNotification keeps schedule headline and detail separate on iOS', () => {
    const scheduleBody = 'ตารางงาน 09/08/2026 (วันนี้) · เข้างาน 2 คน\nปิ่น 6:30, มุก 7:00';
    const ios = buildSplitOsNotification('ตารางงานวันนี้', scheduleBody);
    expect(ios.title).toBe('ตารางงานวันนี้');
    expect(ios.body).toBe(scheduleBody);
  });

  test('buildSplitOsNotification truncates long iOS title and body independently', () => {
    const longHeadline = 'ก'.repeat(80);
    const longDetail = 'ข'.repeat(200);
    const ios = buildSplitOsNotification(longHeadline, longDetail);
    expect(ios.title.length).toBeLessThanOrEqual(OS_NOTIFICATION_TITLE_MAX);
    expect(ios.body.length).toBeLessThanOrEqual(OS_NOTIFICATION_BODY_MAX);
    expect(ios.body).not.toBe('');
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
