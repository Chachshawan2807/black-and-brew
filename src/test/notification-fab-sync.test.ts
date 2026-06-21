/**
 * FAB notification sync matrix (all platforms):
 *
 * | Scenario                         | Mechanism                          |
 * |----------------------------------|------------------------------------|
 * | Same tab, foreground             | Supabase Realtime → pushNotification |
 * | Same device, multiple tabs       | localStorage `storage` event       |
 * | Background / closed (PWA/mobile) | Web Push → SW → IDB + postMessage  |
 * | Return to app (any platform)     | visibility / focus / pageshow hydrate |
 * | Desktop browser + mobile browser | Same hooks via NotificationProvider |
 */

import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('notification fab cross-platform sync', () => {
  const hookSource = readFileSync(
    resolve(__dirname, '../hooks/use-inventory-notifications.ts'),
    'utf8',
  );
  const layoutSource = readFileSync(
    resolve(__dirname, '../app/[locale]/layout.tsx'),
    'utf8',
  );
  const crossTabSource = readFileSync(
    resolve(__dirname, '../lib/notification-cross-tab.ts'),
    'utf8',
  );
  const serviceWorkerSource = readFileSync(
    resolve(__dirname, '../../public/sw.js'),
    'utf8',
  );

  test('NotificationProvider wraps FAB on all pages (desktop + mobile)', () => {
    expect(layoutSource).toContain('NotificationProvider');
    expect(layoutSource).toContain('InventoryNotificationFAB');
    expect(layoutSource).toMatch(
      /<NotificationProvider>[\s\S]*<InventoryNotificationFAB/,
    );
  });

  test('hook syncs via realtime, cross-tab storage, and resume events', () => {
    expect(hookSource).toContain("postgres_changes");
    expect(hookSource).toContain('subscribeNotificationSync');
    expect(hookSource).toContain('visibilitychange');
    expect(hookSource).toContain('pageshow');
    expect(hookSource).toContain('SW_INVENTORY_PUSH_RECEIVED');
  });

  test('hook catches up missed cross-device inventory logs from the server for mobile FAB sync', () => {
    expect(hookSource).toContain('fetchDataChangeLogs');
    expect(hookSource).toContain('syncInventoryNotificationCatchUp');
    expect(hookSource).toContain("fetchDataChangeLogs({ module: 'inventory'");
    expect(hookSource).toContain('skipSystemNotification: true');
  });

  test('service worker push messages preserve SW unread count for launcher badges', () => {
    expect(hookSource).toContain('unreadCount?: number');
    expect(hookSource).toMatch(/pushNotification\(\s*data\.notification,\s*data\.unreadCount/);
  });

  test('daily report web pushes are stored and forwarded to the notification panel', () => {
    expect(serviceWorkerSource).toContain("payload.kind === 'daily_report'");
    expect(serviceWorkerSource).toContain('const unreadCount = await safeResolveUnreadCount(payload);');
    expect(serviceWorkerSource).toContain("type: 'INVENTORY_PUSH_RECEIVED'");
    expect(serviceWorkerSource).toContain('await applyHomeScreenBadge(unreadCount);');
  });

  test('service worker push messages do not duplicate OS banners already shown by the PWA worker', () => {
    expect(hookSource).toContain('systemNotificationShown?: boolean');
    expect(hookSource).toContain('skipSystemNotification: data.systemNotificationShown === true');
    expect(hookSource).toContain('options?.skipSystemNotification');
  });

  test('cross-tab listener avoids write-back loops', () => {
    expect(hookSource).toContain('syncFromStorageAndServerSoon(false)');
    expect(crossTabSource).toContain('storage');
  });

  test('FAB uses shared NotificationProvider state (not isolated storage)', () => {
    const fabSource = readFileSync(
      resolve(__dirname, '../components/notifications/InventoryNotificationFAB.tsx'),
      'utf8',
    );
    expect(fabSource).toContain('useNotificationState');
    expect(fabSource).not.toContain('localStorage');
  });

  test('notification FAB hides while another floating overlay is open', () => {
    const fabSource = readFileSync(
      resolve(__dirname, '../components/notifications/InventoryNotificationFAB.tsx'),
      'utf8',
    );

    expect(fabSource).toContain('isAnyOtherOpen');
    expect(fabSource).toContain("isAnyOtherOpen('notification')");
  });
});
