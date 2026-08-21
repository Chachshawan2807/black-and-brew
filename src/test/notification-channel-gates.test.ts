import { describe, expect, test } from 'vitest';
import type { InventoryNotification } from '@/lib/notification-types';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/lib/notification-types';
import {
  shouldShowOsNotification,
  wantsInAppNotificationSync,
} from '@/lib/notification-channel-gates';

function prefs(overrides: Partial<typeof DEFAULT_NOTIFICATION_PREFERENCES> = {}) {
  return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...overrides };
}

function sampleNotification(
  overrides: Partial<InventoryNotification> = {},
): InventoryNotification {
  return {
    id: 'n-1',
    logId: 'n-1',
    action: 'UPDATE',
    entityId: null,
    entityLabel: null,
    actorLabel: 'ระบบ',
    occurredAt: '2026-08-12T00:00:00.000Z',
    title: 'ทดสอบ',
    summary: 'รายละเอียด',
    fieldSummary: 'รายละเอียด',
    priority: 'normal',
    read: false,
    batchedCount: 1,
    metadata: {},
    ...overrides,
  };
}

describe('wantsInAppNotificationSync', () => {
  test('stays on when inventory is off but other channels are on', () => {
    expect(
      wantsInAppNotificationSync(
        prefs({
          enabled: false,
          dailyScheduleReports: true,
        }),
      ),
    ).toBe(true);
    expect(
      wantsInAppNotificationSync(
        prefs({
          enabled: false,
          securityAlerts: true,
        }),
      ),
    ).toBe(true);
  });

  test('is off only when every channel is off', () => {
    expect(
      wantsInAppNotificationSync(
        prefs({
          enabled: false,
          systemNotifications: false,
          dailyScheduleReports: false,
          proactiveInsights: false,
          securityAlerts: false,
        }),
      ),
    ).toBe(false);
  });
});

describe('shouldShowOsNotification', () => {
  test('shows security banners when securityAlerts is on without inventory', () => {
    const notification = sampleNotification({
      title: 'PIN ถูกล็อก',
      metadata: { kind: 'pin_lockout', module: 'security' },
    });
    expect(
      shouldShowOsNotification(
        notification,
        prefs({ enabled: false, securityAlerts: true, systemNotifications: false }),
      ),
    ).toBe(true);
  });

  test('requires systemNotifications for bean order created alerts without inventory', () => {
    const notification = sampleNotification({
      title: 'คุณเอ',
      metadata: { kind: 'bean_order_created', module: 'bean_orders' },
    });
    expect(
      shouldShowOsNotification(
        notification,
        prefs({ enabled: false, systemNotifications: true }),
      ),
    ).toBe(true);
    expect(
      shouldShowOsNotification(
        notification,
        prefs({ enabled: true, systemNotifications: false }),
      ),
    ).toBe(false);
  });

  test('requires inventory + systemNotifications for stock alerts', () => {
    const notification = sampleNotification({
      title: '+ กาแฟ',
      metadata: { module: 'inventory', operation: 'record_transaction', type: 'IN' },
    });
    expect(
      shouldShowOsNotification(notification, prefs({ enabled: true, systemNotifications: true })),
    ).toBe(true);
    expect(
      shouldShowOsNotification(notification, prefs({ enabled: false, systemNotifications: true })),
    ).toBe(false);
    expect(
      shouldShowOsNotification(notification, prefs({ enabled: true, systemNotifications: false })),
    ).toBe(false);
  });
});
