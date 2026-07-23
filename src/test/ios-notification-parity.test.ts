import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';
import {
  buildIosSafeNotificationOptions,
  buildOsNotificationOptions,
  isIosWebPushClient,
} from '@/lib/pwa-assets';

const ROOT = path.resolve(__dirname, '..', '..');
const SW = path.join(ROOT, 'public/sw.js');
const IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15';
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/150.0.0.0 Mobile Safari/537.36';

describe('iOS notification parity', () => {
  test('isIosWebPushClient detects iPhone and iPad user agents', () => {
    expect(isIosWebPushClient(IOS_UA)).toBe(true);
    expect(
      isIosWebPushClient(
        'Mozilla/5.0 (iPad; CPU OS 18_7 like Mac OS X) AppleWebKit/605.1.15',
      ),
    ).toBe(true);
    expect(isIosWebPushClient(ANDROID_UA)).toBe(false);
  });

  test('buildIosSafeNotificationOptions strips WebKit-incompatible fields', () => {
    const safe = buildIosSafeNotificationOptions({
      body: 'รับ 2 · คงเหลือ: 0 → 2',
      icon: 'https://example.com/icon.png',
      badge: 'https://example.com/badge.png',
      tag: 'bb-inventory',
      vibrate: [120, 60, 120],
      renotify: true,
      requireInteraction: true,
      timestamp: Date.now(),
      silent: false,
      data: { url: '/th/inventory' },
    });

    expect(safe.body).toBe('รับ 2 · คงเหลือ: 0 → 2');
    expect(safe.icon).toBe('https://example.com/icon.png');
    expect(safe.tag).toBe('bb-inventory');
    expect(safe.data).toEqual({ url: '/th/inventory' });
    expect(safe).not.toHaveProperty('vibrate');
    expect(safe).not.toHaveProperty('renotify');
    expect(safe).not.toHaveProperty('badge');
    expect(safe).not.toHaveProperty('requireInteraction');
    expect(safe).not.toHaveProperty('timestamp');
    expect(safe).not.toHaveProperty('silent');
  });

  test('buildOsNotificationOptions returns iOS-safe options for iPhone user agents', () => {
    const opts = buildOsNotificationOptions({
      body: 'รับ 2 · คงเหลือ: 0 → 2',
      origin: 'https://blackandbrew.vercel.app',
      userAgent: IOS_UA,
    });

    expect(opts.icon).toBe('https://blackandbrew.vercel.app/images/push-notification-icon.png');
    expect(opts).not.toHaveProperty('vibrate');
    expect(opts).not.toHaveProperty('renotify');
    expect(opts).not.toHaveProperty('badge');
  });

  test('buildOsNotificationOptions keeps Android badge and vibrate hints for Chromium', () => {
    const opts = buildOsNotificationOptions({
      body: 'รับ 2 · คงเหลือ: 0 → 2',
      origin: 'https://blackandbrew.vercel.app',
      userAgent: ANDROID_UA,
      enableVibrate: true,
    });

    expect(opts.badge).toBe('https://blackandbrew.vercel.app/images/notification-badge.png');
    expect(opts.renotify).toBe(true);
  });

  test('service worker proactively uses iOS-safe notification options', () => {
    const sw = fs.readFileSync(SW, 'utf8');
    expect(sw).toContain('function isIosPushClient');
    expect(sw).toContain('delete safe.badge');
    expect(sw).toContain('delete safe.requireInteraction');
    expect(sw).toContain('delete safe.timestamp');
    expect(sw).toMatch(/isIosPushClient\(\)[\s\S]*buildIosSafeNotificationOptions/);
  });

  test('foreground notification bridge applies iOS-safe options before showNotification', () => {
    const bridge = fs.readFileSync(
      path.join(ROOT, 'src/lib/pwa-notification-bridge.ts'),
      'utf8',
    );
    expect(bridge).toContain('buildIosSafeNotificationOptions');
    expect(bridge).toContain('isIosWebPushClient');
    expect(bridge).toMatch(/showNotification\(formatted\.title,\s*iosSafePayload\)/);
  });

  test('inventory hook refreshes push registration state on mount for defer parity', () => {
    const hook = fs.readFileSync(
      path.join(ROOT, 'src/hooks/use-inventory-notifications.ts'),
      'utf8',
    );
    expect(hook).toContain('refreshLocalPushSubscriptionState');
    expect(hook).toContain('wantsPushRegistration');
  });
});
