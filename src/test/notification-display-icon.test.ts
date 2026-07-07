import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  isScheduleNotification,
  resolveNotificationDisplayIcon,
} from '@/lib/notification-display-icon';
import type { InventoryNotification } from '@/lib/notification-types';

function sampleNotification(
  overrides: Partial<InventoryNotification> = {},
): InventoryNotification {
  return {
    id: 'n1',
    logId: 'n1',
    action: 'UPDATE',
    entityId: 'item-1',
    entityLabel: 'กาแฟ',
    actorLabel: 'Test',
    occurredAt: new Date().toISOString(),
    title: 'แก้ไขรายการ: กาแฟ',
    summary: 'summary',
    fieldSummary: 'summary',
    priority: 'normal',
    read: false,
    batchedCount: 1,
    metadata: {},
    ...overrides,
  };
}

describe('notification display icons', () => {
  test('uses inventory quick action icons for stock operations', () => {
    expect(
      resolveNotificationDisplayIcon(
        sampleNotification({
          metadata: { operation: 'record_transaction', type: 'IN' },
        }),
      ).kind,
    ).toBe('stock-in');

    expect(
      resolveNotificationDisplayIcon(
        sampleNotification({
          metadata: { operation: 'record_transaction', type: 'OUT' },
        }),
      ).kind,
    ).toBe('stock-out');

    expect(
      resolveNotificationDisplayIcon(
        sampleNotification({
          metadata: { operation: 'set_stock' },
        }),
      ).kind,
    ).toBe('stock-adjust');
  });

  test('uses calendar styling for daily schedule reports', () => {
    const item = sampleNotification({
      title: 'ตารางงานวันนี้',
      metadata: { kind: 'daily_report', url: '/th/schedule' },
    });

    expect(isScheduleNotification(item)).toBe(true);
    expect(resolveNotificationDisplayIcon(item).kind).toBe('schedule');
  });

  test('notification panel uses shared item icon component', () => {
    const root = path.resolve(__dirname, '..');
    const panel = fs.readFileSync(
      path.join(root, 'components/notifications/NotificationPanel.tsx'),
      'utf-8',
    );
    const itemIcon = fs.readFileSync(
      path.join(root, 'components/notifications/NotificationItemIcon.tsx'),
      'utf-8',
    );

    expect(panel).toContain('NotificationItemIcon');
    expect(panel).not.toContain('function ActionIcon');
    expect(itemIcon).toContain('PackagePlus');
    expect(itemIcon).toContain('PackageMinus');
    expect(itemIcon).toContain('SlidersHorizontal');
    expect(itemIcon).toContain('CalendarRange');
    const displayIcon = fs.readFileSync(
      path.join(root, 'lib/notification-display-icon.ts'),
      'utf-8',
    );
    expect(displayIcon).toContain('INVENTORY_QUICK_ACTION_COLORS');
  });
});
