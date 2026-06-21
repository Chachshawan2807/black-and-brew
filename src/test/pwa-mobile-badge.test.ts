import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const ROOT = path.resolve(__dirname, '..', '..');
const SW = path.join(ROOT, 'public/sw.js');

describe('mobile home-screen badge (sw.js)', () => {
  const sw = fs.readFileSync(SW, 'utf8');

  test('loads shared badge helper and awaits setAppBadge inside push waitUntil', () => {
    expect(sw).toContain("importScripts('/pwa-badge.js')");
    expect(sw).toContain('event.waitUntil');
    expect(sw).toContain('await applyHomeScreenBadge(unreadCount)');
    expect(sw).toContain('await self.registration.showNotification');
  });

  test('SET_BADGE message uses waitUntil for iOS service worker lifecycle', () => {
    expect(sw).toMatch(/addEventListener\('message'[\s\S]*event\.waitUntil\(applyHomeScreenBadge/);
  });

  test('each notification uses unique tag for Android launcher badge stacking', () => {
    expect(sw).toContain('renotify: true');
    expect(sw).not.toMatch(/tag:\s*'bb-inventory'[^,]*,\s*\/\/ always same/);
  });

  test('persists unread count in IDB before showing notification', () => {
    expect(sw).toContain('prependNotification');
    expect(sw).toMatch(/resolveUnreadCount[\s\S]*prependNotification/);
  });

  test('inventory push always shows the PWA notification banner from the service worker', () => {
    expect(sw).toContain('systemNotificationShown: true');
    expect(sw).toContain('await self.registration.showNotification(payload.title, options)');
    expect(sw).not.toContain('if (!isVisible)');
  });
});
