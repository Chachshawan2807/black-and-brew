import { describe, expect, test } from 'vitest';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import {
  beanOrderDeliveredNotificationLogId,
  formatBeanOrderDeliveredNotification,
  formatBeanOrderDeliveredSummary,
  isEligibleBeanOrderDeliveredNotification,
  isTrackingDeliveredStatus,
  shouldNotifyBeanOrderDelivered,
} from '@/lib/bean-orders/delivery-notification';

function sampleRow(overrides: Partial<DataChangeLogRow> = {}): DataChangeLogRow {
  return {
    id: 'log-1',
    occurred_at: '2026-07-22T12:00:00.000Z',
    actor_id: null,
    actor_label: 'ระบบติดตามพัสดุ',
    actor_access_level: 'system',
    action: 'UPDATE',
    module: 'bean_orders',
    entity_type: 'bean_order_delivery',
    entity_id: 'order-1',
    entity_label: 'BO-20260722-003',
    field_changes: [],
    old_value: null,
    new_value: null,
    source: 'system',
    ip_address: null,
    user_agent: null,
    status: 'success',
    error_message: null,
    metadata: {
      kind: 'bean_order_delivered',
      notificationLogId: 'bb-bean-delivered-order-1',
      title: 'จัดส่งสำเร็จ',
      summary: 'ทัพพ์เทพ ต.คึกคัก อ.เมืองพังงา จ.พังงา',
      fieldSummary: 'ทัพพ์เทพ ต.คึกคัก อ.เมืองพังงา จ.พังงา',
      url: '/th/bean-orders/order-1',
      trackingNumber: 'KEX123',
      orderNo: 'BO-20260722-003',
      customerName: 'ทัพพ์เทพ',
      destinationSubdistrict: 'คึกคัก',
      destinationDistrict: 'เมืองพังงา',
      destinationProvince: 'พังงา',
    },
    ...overrides,
  };
}

describe('bean order delivery notification helpers', () => {
  test('detects delivered status transitions only once', () => {
    expect(isTrackingDeliveredStatus('delivered')).toBe(true);
    expect(isTrackingDeliveredStatus('Delivered')).toBe(true);
    expect(isTrackingDeliveredStatus('in_transit')).toBe(false);

    expect(shouldNotifyBeanOrderDelivered('in_transit', 'delivered')).toBe(true);
    expect(shouldNotifyBeanOrderDelivered(null, 'delivered')).toBe(true);
    expect(shouldNotifyBeanOrderDelivered('delivered', 'delivered')).toBe(false);
    expect(shouldNotifyBeanOrderDelivered('in_transit', 'in_transit')).toBe(false);
  });

  test('builds stable notification log id per order', () => {
    expect(beanOrderDeliveredNotificationLogId('order-1')).toBe('bb-bean-delivered-order-1');
  });

  test('formats delivered summary as customer name plus destination admin areas', () => {
    expect(
      formatBeanOrderDeliveredSummary('ทัพพ์เทพ นิจนิรันดร์กุล', {
        subdistrict: 'คึกคัก',
        district: 'เมืองพังงา',
        province: 'พังงา',
      }),
    ).toBe('ทัพพ์เทพ นิจนิรันดร์กุล ต.คึกคัก อ.เมืองพังงา จ.พังงา');
  });

  test('eligibility and formatting for bean_order_delivered logs', () => {
    expect(isEligibleBeanOrderDeliveredNotification(sampleRow())).toBe(true);
    expect(
      isEligibleBeanOrderDeliveredNotification(
        sampleRow({ module: 'inventory', metadata: { kind: 'bean_order_delivered' } }),
      ),
    ).toBe(false);
    expect(
      isEligibleBeanOrderDeliveredNotification(
        sampleRow({ metadata: { kind: 'other' } }),
      ),
    ).toBe(false);

    const formatted = formatBeanOrderDeliveredNotification(sampleRow(), 'th');
    expect(formatted.title).toBe('จัดส่งสำเร็จ');
    expect(formatted.summary).toBe('ทัพพ์เทพ ต.คึกคัก อ.เมืองพังงา จ.พังงา');
    expect(formatted.summary).not.toContain('BO-');
    expect(formatted.metadata.kind).toBe('bean_order_delivered');
    expect(formatted.metadata.url).toBe('/th/bean-orders/order-1');
    expect(formatted.logId).toBe('bb-bean-delivered-order-1');
  });
});
