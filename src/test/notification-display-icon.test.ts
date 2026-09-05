import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  formatStockOperationTitle,
  isScheduleNotification,
  resolveNotificationDisplayIcon,
  STOCK_OPERATION_SYMBOL,
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
    expect(STOCK_OPERATION_SYMBOL.IN).toBe('+');
    expect(STOCK_OPERATION_SYMBOL.OUT).toBe('−');
    expect(STOCK_OPERATION_SYMBOL.ADJUST).toBe('⇄');
    expect(formatStockOperationTitle('IN', 'กาแฟ')).toBe('+ กาแฟ');

    expect(
      resolveNotificationDisplayIcon(
        sampleNotification({
          title: '+ กาแฟ',
          metadata: { operation: 'record_transaction', type: 'IN' },
        }),
      ).kind,
    ).toBe('stock-in');

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

  test('uses warning triangle styling for proactive insight notifications', () => {
    const item = sampleNotification({
      title: 'คนน้อย · สต็อกต่ำ',
      metadata: { kind: 'proactive_insight', module: 'insights', url: '/th/inventory' },
    });

    expect(resolveNotificationDisplayIcon(item).kind).toBe('insight');
    expect(resolveNotificationDisplayIcon(item).containerClass).toContain('bg-[#ffe0a8]');
  });

  test('uses shield styling for security notifications', () => {
    const item = sampleNotification({
      title: '⚠️ มีการพยายามเดา PIN',
      metadata: { kind: 'pin_lockout', module: 'security', url: '/th/settings' },
    });

    expect(resolveNotificationDisplayIcon(item).kind).toBe('security');
    expect(resolveNotificationDisplayIcon(item).containerClass).toContain('bg-[#ffe4e6]');
  });

  test('uses truck icon and stock-in green surface for bean order delivered notifications', () => {
    const item = sampleNotification({
      title: 'จัดส่งสำเร็จ',
      metadata: { kind: 'bean_order_delivered', url: '/th/bean-orders/order-1' },
    });

    expect(resolveNotificationDisplayIcon(item).kind).toBe('bean-delivered');
    expect(resolveNotificationDisplayIcon(item).containerClass).toContain('bg-[#d4edda]');
  });

  test('uses truck icon for bean order shipped notifications', () => {
    const item = sampleNotification({
      title: 'ส่งแล้ว',
      metadata: { kind: 'bean_order_shipped', url: '/th/bean-orders/order-1' },
    });

    expect(resolveNotificationDisplayIcon(item).kind).toBe('bean-delivered');
    expect(resolveNotificationDisplayIcon(item).containerClass).toContain('bg-[#d4edda]');
  });

  test('uses coffee icon and order blue surface for bean order created notifications', () => {
    const item = sampleNotification({
      title: 'ออเดอร์เมล็ดกาแฟใหม่',
      metadata: {
        kind: 'bean_order_created',
        module: 'bean_orders',
        url: '/th/bean-orders/order-1',
      },
    });

    expect(resolveNotificationDisplayIcon(item).kind).toBe('bean-created');
    expect(resolveNotificationDisplayIcon(item).containerClass).toContain('bg-[#d1ecf1]');
  });

  test('uses banknote icon and green surface for bean order payment notifications', () => {
    const item = sampleNotification({
      title: 'ชำระแล้ว',
      metadata: {
        kind: 'bean_order_payment_confirmed',
        module: 'bean_orders',
        url: '/th/bean-orders/order-1',
      },
    });

    expect(resolveNotificationDisplayIcon(item).kind).toBe('bean-paid');
    expect(resolveNotificationDisplayIcon(item).containerClass).toContain('bg-[#d4edda]');
    expect(resolveNotificationDisplayIcon(item).containerClass).not.toContain('bg-[#d1ecf1]');
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
    expect(itemIcon).toContain('Coffee');
    expect(itemIcon).toContain('PackagePlus');
    expect(itemIcon).toContain('PackageMinus');
    expect(itemIcon).toContain('Truck');
    expect(itemIcon).toContain('Banknote');
    expect(itemIcon).toContain('SlidersHorizontal');
    expect(itemIcon).toContain('CalendarRange');
    expect(itemIcon).toContain('AlertTriangle');
    const displayIcon = fs.readFileSync(
      path.join(root, 'lib/notification-display-icon.ts'),
      'utf-8',
    );
    expect(displayIcon).toContain('BB_ICON_BADGE_FILL');
  });
});
