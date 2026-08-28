import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  shouldShowOsNotification,
  wantsInAppNotificationSync,
} from '@/lib/notification-channel-gates';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/lib/notification-types';
import type { InventoryNotification } from '@/lib/notification-types';

const ROOT = resolve(__dirname, '..');

function read(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

describe('secretary notification gates', () => {
  test('secretaryAlerts defaults off in notification types', () => {
    expect(DEFAULT_NOTIFICATION_PREFERENCES.secretaryAlerts).toBe(false);
  });

  test('wantsInAppNotificationSync ignores secretary when only secretaryAlerts is on', () => {
    const prefs = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      enabled: false,
      systemNotifications: false,
      dailyScheduleReports: false,
      proactiveInsights: false,
      securityAlerts: false,
      secretaryAlerts: true,
    };
    expect(wantsInAppNotificationSync(prefs)).toBe(true);
  });

  test('shouldShowOsNotification blocks secretary when secretaryAlerts is off', () => {
    const notification: InventoryNotification = {
      id: 'x',
      logId: 'x',
      action: 'UPDATE',
      entityId: '2026-08-28',
      entityLabel: '2026-08-28',
      actorLabel: 'เลขาส่วนตัว',
      occurredAt: new Date().toISOString(),
      title: 'เลขาส่วนตัว',
      summary: 'งานค้าง 2',
      fieldSummary: 'งานค้าง 2',
      priority: 'normal',
      read: false,
      batchedCount: 1,
      metadata: { kind: 'secretary_digest', module: 'secretary' },
    };

    expect(
      shouldShowOsNotification(notification, {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        secretaryAlerts: false,
      }),
    ).toBe(false);

    expect(
      shouldShowOsNotification(notification, {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        secretaryAlerts: true,
      }),
    ).toBe(true);
  });

  test('menu includes secretary route', () => {
    const menu = read('lib/menu-list.ts');
    expect(menu).toContain('/secretary');
    expect(menu).toContain('เลขาส่วนตัว');
  });
});
