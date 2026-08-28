import { describe, expect, test } from 'vitest';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import {
  beanOrderShippedNotificationLogId,
  formatBeanOrderShippedNotification,
  formatBeanOrderShippedSummary,
  isEligibleBeanOrderShippedNotification,
  shouldNotifyBeanOrderShipped,
} from '@/lib/bean-orders/shipment-notification';

function sampleRow(overrides: Partial<DataChangeLogRow> = {}): DataChangeLogRow {
  return {
    id: 'log-1',
    occurred_at: '2026-07-26T12:00:00.000Z',
    actor_id: null,
    actor_label: 'ระบบจัดส่ง',
    actor_access_level: 'system',
    action: 'UPDATE',
    module: 'bean_orders',
    entity_type: 'bean_order_shipment',
    entity_id: 'order-1',
    entity_label: 'BO-20260726-1',
    field_changes: [],
    old_value: null,
    new_value: null,
    source: 'system',
    ip_address: null,
    user_agent: null,
    status: 'success',
    error_message: null,
    metadata: {
      kind: 'bean_order_shipped',
      notificationLogId: 'bb-bean-shipped-order-1',
      title: 'ส่งแล้ว',
      summary: 'ทัพพ์เทพ · KEX123',
      fieldSummary: 'ทัพพ์เทพ · KEX123',
      url: '/th/bean-orders/order-1',
      trackingNumber: 'KEX123',
      orderNo: 'BO-20260726-1',
      customerName: 'ทัพพ์เทพ',
    },
    ...overrides,
  };
}

describe('bean order shipped notification helpers', () => {
  test('notifies only on pending → shipped transition', () => {
    expect(shouldNotifyBeanOrderShipped('pending', 'shipped')).toBe(true);
    expect(shouldNotifyBeanOrderShipped(null, 'shipped')).toBe(true);
    expect(shouldNotifyBeanOrderShipped('shipped', 'shipped')).toBe(false);
    expect(shouldNotifyBeanOrderShipped('pending', 'pending')).toBe(false);
  });

  test('builds stable notification log id per order', () => {
    expect(beanOrderShippedNotificationLogId('order-1')).toBe('bb-bean-shipped-order-1');
  });

  test('formats shipped summary as customer name plus tracking when present', () => {
    expect(formatBeanOrderShippedSummary('ทัพพ์เทพ', 'KEX123')).toBe('ทัพพ์เทพ · KEX123');
    expect(formatBeanOrderShippedSummary('ทัพพ์เทพ', null)).toBe('ทัพพ์เทพ');
    expect(formatBeanOrderShippedSummary(null, 'KEX123', 'th')).toBe('ลูกค้า · KEX123');
  });

  test('eligibility and formatting for bean_order_shipped logs', () => {
    expect(isEligibleBeanOrderShippedNotification(sampleRow())).toBe(true);
    expect(
      isEligibleBeanOrderShippedNotification(
        sampleRow({ module: 'inventory', metadata: { kind: 'bean_order_shipped' } }),
      ),
    ).toBe(false);
    expect(
      isEligibleBeanOrderShippedNotification(
        sampleRow({ metadata: { kind: 'bean_order_delivered' } }),
      ),
    ).toBe(false);

    const formatted = formatBeanOrderShippedNotification(sampleRow(), 'th');
    expect(formatted.title).toBe('ส่งแล้ว');
    expect(formatted.summary).toBe('ทัพพ์เทพ · KEX123');
    expect(formatted.metadata.kind).toBe('bean_order_shipped');
    expect(formatted.metadata.url).toBe('/th/bean-orders/order-1');
    expect(formatted.logId).toBe('bb-bean-shipped-order-1');
  });
});
