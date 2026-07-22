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
  const panelSource = readFileSync(
    resolve(__dirname, '../components/notifications/NotificationPanel.tsx'),
    'utf8',
  );
  const bellSource = readFileSync(
    resolve(__dirname, '../components/notifications/NotificationBell.tsx'),
    'utf8',
  );

  test('NotificationProvider wraps FAB on all pages (desktop + mobile)', () => {
    const deferredSource = readFileSync(
      resolve(__dirname, '../components/shell/DeferredOverlays.tsx'),
      'utf8',
    );
    expect(layoutSource).toContain('NotificationProvider');
    expect(layoutSource).toContain('DeferredOverlays');
    expect(deferredSource).toContain('InventoryNotificationFAB');
  });

  test('hook syncs via realtime, cross-tab storage, and resume events', () => {
    expect(hookSource).toContain("postgres_changes");
    expect(hookSource).toContain('realtimeReady');
    expect(hookSource).toContain('subscribeNotificationSync');
    expect(hookSource).toContain('visibilitychange');
    expect(hookSource).toContain('pageshow');
    expect(hookSource).toContain('SW_INVENTORY_PUSH_RECEIVED');
  });

  test('hook enables realtime immediately when notifications are enabled (no mobile delay)', () => {
    expect(hookSource).toContain('prefs.enabled');
    expect(hookSource).toContain('setRealtimeReady(true)');
    expect(hookSource).not.toMatch(/setTimeout\(\(\) => setRealtimeReady\(true\),\s*5000\)/);
  });

  test('hook reconnects Supabase realtime after mobile resume', () => {
    expect(hookSource).toContain('realtimeReconnectKey');
    expect(hookSource).toContain('shouldReconnectRealtimeOnResume');
    expect(hookSource).toMatch(/setRealtimeReconnectKey[\s\S]*visibilitychange/);
  });

  test('hook avoids forced realtime reconnect on every brief tab focus', () => {
    expect(hookSource).toContain('isConnecting');
    expect(hookSource).toContain('hiddenAt');
  });

  test('hook defers foreground OS banners to Web Push when subscription is active', () => {
    expect(hookSource).toContain('shouldDeferOsNotificationToPush');
  });

  test('hook does not warn that realtime is unavailable for normal CLOSED channel cleanup', () => {
    expect(hookSource).not.toMatch(
      /status !== 'CHANNEL_ERROR' && status !== 'TIMED_OUT' && status !== 'CLOSED'/,
    );
  });

  test('hook catches up missed cross-device inventory logs from the server for mobile FAB sync', () => {
    expect(hookSource).toContain('fetchDataChangeLogs');
    expect(hookSource).toContain('syncInventoryNotificationCatchUp');
    expect(hookSource).toContain('syncScheduleNotificationCatchUp');
    expect(hookSource).toContain('syncNotificationCatchUp');
    expect(hookSource).toContain("fetchDataChangeLogs({ module: 'inventory'");
    expect(hookSource).toContain("fetchDataChangeLogs({ module: 'schedule'");
    expect(hookSource).toContain('skipSystemNotification: true');
  });

  test('hook syncs daily schedule report logs via realtime and server catch-up', () => {
    expect(hookSource).toContain("attachChangeLogListener(nextChannel, 'schedule')");
    expect(hookSource).toContain('isEligibleDailyReportNotification');
    expect(hookSource).toContain('formatDailyReportNotification');
    expect(hookSource).toContain('dailyScheduleReports');
    expect(hookSource).toMatch(/openPanel[\s\S]*syncNotificationCatchUp/);
  });

  test('hook syncs bean order delivered logs via realtime and server catch-up', () => {
    expect(hookSource).toContain("attachChangeLogListener(nextChannel, 'bean_orders')");
    expect(hookSource).toContain('isEligibleBeanOrderDeliveredNotification');
    expect(hookSource).toContain('formatBeanOrderDeliveredNotification');
    expect(hookSource).toContain("fetchDataChangeLogs({ module: 'bean_orders'");
  });

  test('clearing history prevents old server catch-up logs from being restored', () => {
    expect(hookSource).toContain('saveNotificationClearWatermark');
    expect(hookSource).toContain('loadNotificationClearWatermark');
    expect(hookSource).toContain('isAfterNotificationClearWatermark(row.occurred_at, clearWatermark)');
  });

  test('service worker push messages preserve SW unread count for launcher badges', () => {
    expect(hookSource).toContain('unreadCount?: number');
    expect(hookSource).toMatch(/pushNotification\(\s*data\.notification,\s*data\.unreadCount/);
  });

  test('PWA resume refreshes push subscription for closed-mobile recovery', () => {
    const pwaRegisterSource = readFileSync(
      resolve(__dirname, '../components/PwaRegister.tsx'),
      'utf8',
    );
    const pushClientSource = readFileSync(
      resolve(__dirname, '../lib/push-subscription-client.ts'),
      'utf8',
    );

    expect(pwaRegisterSource).toContain('schedulePushSubscriptionMaintenance');
    expect(pwaRegisterSource).toContain('pageshow');
    expect(pwaRegisterSource).toContain('bb-pin-authenticated');
    expect(pushClientSource).toContain('schedulePushSubscriptionMaintenance');
    expect(pushClientSource).toContain('MAINTENANCE_RETRY_MS');
  });

  test('daily report web pushes are stored and forwarded to the notification panel', () => {
    expect(serviceWorkerSource).toContain("payload.kind === 'daily_report'");
    expect(serviceWorkerSource).toContain("payload.kind === 'bean_order_delivered'");
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

  test('notification FAB fades out while its own panel is open', () => {
    const fabSource = readFileSync(
      resolve(__dirname, '../components/notifications/InventoryNotificationFAB.tsx'),
      'utf8',
    );

    expect(fabSource).toMatch(/panelOpen\s*\|\|/);
    expect(fabSource).toContain('FabFadePresence');
  });

  test('notification bell FAB does not render a close icon', () => {
    expect(bellSource).not.toContain('AnimatePresence');
    expect(bellSource).not.toContain('key="close"');
  });

  test('notification FAB matches other stack buttons (black circle, white bell)', () => {
    expect(bellSource).toContain('FAB_STACK_INNER_CLASS');
    expect(bellSource).toContain('<Bell');
    expect(bellSource).not.toContain('PWA_BRAND_ICON');
    expect(bellSource).not.toContain('bg-transparent');
  });

  test('notification FAB badge shows uncapped counts via shared formatter', () => {
    expect(bellSource).toContain('formatInAppBadgeLabel');
    expect(bellSource).not.toContain('99+');
  });

  test('notification panel dismisses via backdrop tap and header close', () => {
    expect(panelSource).toMatch(/onClick=\{closePanel\}/);
    expect(panelSource).toMatch(/aria-label=\{isTh \? 'ปิด' : 'Close'\}/);
  });

  test('notification FAB and panel use generic notification copy', () => {
    expect(panelSource).toContain("'การแจ้งเตือน'");
    expect(panelSource).not.toContain('แจ้งเตือนคลังสินค้า');
    expect(bellSource).toContain("'การแจ้งเตือน'");
    expect(bellSource).not.toContain('การแจ้งเตือนคลังสินค้า');
  });
});
