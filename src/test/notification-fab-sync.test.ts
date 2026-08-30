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

  test('hook enables realtime when any notification channel is enabled', () => {
    expect(hookSource).toContain('wantsInAppNotificationSync');
    expect(hookSource).toContain('idleRealtimeReady');
    expect(hookSource).toContain('setIdleRealtimeReady(true)');
    expect(hookSource).toMatch(/realtimeReady\s*=\s*wantsInAppSync\s*&&\s*idleRealtimeReady/);
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

  test('hook deduplicates push/realtime races via recent logId set', () => {
    expect(hookSource).toContain('recentLogIdsRef');
    expect(hookSource).toContain('n.logId === dedupeKey');
  });

  test('inventory realtime emits one notification per change log row', () => {
    expect(hookSource).not.toContain('createBatchAccumulator');
    expect(hookSource).not.toContain('formatBatchedNotificationFromRows');
    expect(hookSource).toMatch(/for \(const row of eligible\) \{\s*pushNotification\(formatNotificationRow\(row, loc\)\)/);
    expect(hookSource).toContain('processRows([row])');
  });

  test('hook uses per-channel OS banner gating', () => {
    expect(hookSource).toContain('shouldShowOsNotification');
  });

  test('service worker skips OS banners when a visible client is already open', () => {
    expect(serviceWorkerSource).toContain('hasVisibleWindowClient');
    expect(serviceWorkerSource).toContain('resolvePushLocale');
  });

  test('hook defers background OS banners to Web Push when subscription is active', () => {
    expect(hookSource).toContain('shouldDeferOsNotificationToPush');
    expect(hookSource).toContain('deferOsToPush');
    expect(hookSource).toContain('skipInsightOsNotification');
  });

  test('hook uses a unique realtime channel topic per subscribe attempt', () => {
    expect(hookSource).toContain('notificationRealtimeChannelSeq');
    expect(hookSource).toMatch(/inventory_change_notifications_\$\{channelId\}/);
  });

  test('hook defers notification channel teardown instead of immediate removeChannel on resubscribe', () => {
    expect(hookSource).not.toMatch(/await supabase\.removeChannel\(previousChannel\)/);
    expect(hookSource).toMatch(/if \(channel\) \{\s*stopChannel\(channel\)/);
  });

  test('hook does not warn that realtime is unavailable for normal CLOSED channel cleanup', () => {
    expect(hookSource).not.toMatch(
      /status !== 'CHANNEL_ERROR' && status !== 'TIMED_OUT' && status !== 'CLOSED'/,
    );
  });

  test('hook catches up missed cross-device logs from the server for mobile FAB sync', () => {
    expect(hookSource).toContain('fetchNotificationCatchUpLogs');
    expect(hookSource).toContain('syncNotificationCatchUp');
    expect(hookSource).toContain('skipSystemNotification: true');
  });

  test('hook syncs proactive insight digest via realtime UPDATE and server catch-up', () => {
    expect(hookSource).toContain("attachChangeLogListener(nextChannel, 'insights', 'UPDATE')");
    expect(hookSource).toContain("attachChangeLogListener(nextChannel, 'insights', 'DELETE')");
    expect(hookSource).toContain('replaceNotificationByDedupeKey');
    expect(hookSource).toContain('isProactiveInsightNotificationItem');
    expect(hookSource).not.toContain('refreshProactiveInsightDigest');
    expect(hookSource).toContain('fetchNotificationCatchUpLogs');
    expect(hookSource).toContain('skipInsightOsNotification');
    expect(hookSource).toMatch(
      /module === 'insights' && event === 'UPDATE'[\s\S]*replaceNotificationByDedupeKey/,
    );
  });

  test('hook syncs daily schedule report logs via realtime and server catch-up', () => {
    expect(hookSource).toContain("attachChangeLogListener(nextChannel, 'schedule')");
    expect(hookSource).toContain('isEligibleDailyReportNotification');
    expect(hookSource).toContain('formatDailyReportNotification');
    expect(hookSource).toContain('dailyScheduleReports');
    expect(hookSource).toMatch(/setPanelOpen[\s\S]*syncNotificationCatchUp/);
    expect(hookSource).toMatch(/openPanel[\s\S]*setPanelOpen\(true\)/);
    // Schedule rows come only from cron (05:00 / 18:00) no client backfill create
    expect(hookSource).not.toContain('ensureDailyReportNotificationHistory');
    expect(hookSource).toContain("'UPDATE'");
    expect(hookSource).toContain('replaceDailyReportNotification');
    expect(hookSource).toContain('silentlyReplaceDailyReportFromRow');
    expect(hookSource).toMatch(
      /module === 'schedule' && event === 'UPDATE'[\s\S]*silentlyReplaceDailyReportFromRow/,
    );
  });

  test('hook syncs bean order delivered logs via realtime and server catch-up', () => {
    expect(hookSource).toContain("attachChangeLogListener(nextChannel, 'bean_orders')");
    expect(hookSource).toContain('isEligibleBeanOrderCreatedNotification');
    expect(hookSource).toContain('formatBeanOrderCreatedNotification');
    expect(hookSource).toContain('isEligibleBeanOrderDeliveredNotification');
    expect(hookSource).toContain('formatBeanOrderDeliveredNotification');
    expect(hookSource).toContain('isEligibleBeanOrderShippedNotification');
    expect(hookSource).toContain('formatBeanOrderShippedNotification');
    expect(hookSource).toContain('fetchNotificationCatchUpLogs');
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

  test('PwaRegister does not re-enter ensureFull on prefs-changed (prevents stack overflow)', () => {
    const pwaRegisterSource = readFileSync(
      resolve(__dirname, '../components/PwaRegister.tsx'),
      'utf8',
    );

    // prefs-changed must not share the same handler that calls ensureFull…
    expect(pwaRegisterSource).toMatch(
      /addEventListener\('bb-notification-prefs-changed',\s*onPrefsChanged\)/,
    );
    expect(pwaRegisterSource).toMatch(
      /onPrefsChanged = \(\) => \{[\s\S]*?schedulePushSubscriptionMaintenance\(locale\);[\s\S]*?\};/,
    );
    expect(pwaRegisterSource).not.toMatch(
      /addEventListener\('bb-notification-prefs-changed',\s*onResume\)/,
    );
    expect(pwaRegisterSource).toMatch(
      /onResume = \(\) => \{[\s\S]*?ensureFullNotificationPreferencesOnAuth\(\);/,
    );
  });

  test('daily report web pushes are stored and forwarded to the notification panel', () => {
    expect(serviceWorkerSource).toContain("payload.kind === 'daily_report'");
    expect(serviceWorkerSource).toContain("payload.kind === 'bean_order_delivered'");
    expect(serviceWorkerSource).toContain("payload.kind === 'bean_order_shipped'");
    expect(serviceWorkerSource).toContain("payload.kind === 'bean_order_created'");
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

  test('notification FAB matches quick action FAB (yellow pastel, same size)', () => {
    expect(bellSource).toContain('INVENTORY_QUICK_ACTION_COLORS.fab');
    expect(bellSource).toContain('INVENTORY_QUICK_ACTION_HOVER.fab');
    expect(bellSource).toContain('FAB_SIZE_CLASS');
    expect(bellSource).toContain('<Bell');
    expect(bellSource).not.toContain('PWA_BRAND_ICON');
    expect(bellSource).not.toContain('bg-transparent');
    expect(bellSource).not.toContain('bg-[#000000]');
  });

  test('notification FAB badge shows uncapped counts via shared formatter', () => {
    expect(bellSource).toContain('formatInAppBadgeLabel');
    expect(bellSource).not.toContain('99+');
  });

  test('notification panel dismisses via backdrop tap and header close', () => {
    expect(panelSource).toMatch(/onClick=\{closePanel\}/);
    expect(panelSource).toMatch(/aria-label=\{isTh \? 'ปิด' : 'Close'\}/);
  });

  test('notification bell FAB opens panel through openPanel for server catch-up', () => {
    expect(bellSource).toContain('openPanel');
    expect(bellSource).toContain('closePanel');
    expect(bellSource).not.toMatch(/setPanelOpen\(!panelOpen\)/);
  });

  test('hook syncs from storage and server on initial mount', () => {
    expect(hookSource).toContain('syncFromStorageAndServerSoon');
    expect(hookSource).toMatch(/sessionIdRef\.current = getClientSessionId\(\)[\s\S]*syncFromStorageAndServerSoon/);
  });

  test('notification FAB mounts before quick action overlay', () => {
    const deferredSource = readFileSync(
      resolve(__dirname, '../components/shell/DeferredOverlays.tsx'),
      'utf8',
    );
    expect(deferredSource).toContain('notificationFabReady');
    expect(deferredSource).toMatch(/timeout:\s*400[\s\S]*notificationFabReady/);
    expect(deferredSource).toMatch(/timeout:\s*1500[\s\S]*quickActionReady/);
  });

  test('unified server catch-up uses single fetchNotificationCatchUpLogs round trip', () => {
    const actionsSource = readFileSync(
      resolve(__dirname, '../app/actions/data-change-log-actions.ts'),
      'utf8',
    );
    expect(actionsSource).toContain('fetchNotificationCatchUpLogs');
    expect(actionsSource).toContain('NOTIFICATION_CATCH_UP_MODULES');
    expect(hookSource).toMatch(/fetchNotificationCatchUpLogs\(\{ limit: 150 \}\)/);
  });

  test('server catch-up and realtime include secretary digest module', () => {
    const actionsSource = readFileSync(
      resolve(__dirname, '../app/actions/data-change-log-actions.ts'),
      'utf8',
    );
    expect(actionsSource).toMatch(/NOTIFICATION_CATCH_UP_MODULES\s*=\s*\[[\s\S]*'secretary'/);
    expect(hookSource).toContain("attachChangeLogListener(nextChannel, 'secretary')");
    expect(hookSource).toContain('isEligibleSecretaryLogRow');
    expect(hookSource).toMatch(/module === 'secretary'[\s\S]*isEligibleSecretaryLogRow/);
  });

  test('notification FAB and panel use generic notification copy', () => {
    expect(panelSource).toContain("'การแจ้งเตือน'");
    expect(panelSource).not.toContain('แจ้งเตือนคลังสินค้า');
    expect(bellSource).toContain("'การแจ้งเตือน'");
    expect(bellSource).not.toContain('การแจ้งเตือนคลังสินค้า');
  });
});
