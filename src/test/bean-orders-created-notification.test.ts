import { describe, expect, test } from 'vitest';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import {
  beanOrderCreatedNotificationLogId,
  buildBeanOrderCreatedCopy,
  formatBeanOrderCreatedItemsSummary,
  formatBeanOrderCreatedNotification,
  isEligibleBeanOrderCreatedNotification,
  resolveBeanOrderCreatedCustomerName,
} from '@/lib/bean-orders/created-notification';

function sampleRow(overrides: Partial<DataChangeLogRow> = {}): DataChangeLogRow {
  return {
    id: 'log-1',
    occurred_at: '2026-07-22T12:00:00.000Z',
    actor_id: null,
    actor_label: 'ระบบออเดอร์เมล็ด',
    actor_access_level: 'system',
    action: 'CREATE',
    module: 'bean_orders',
    entity_type: 'bean_order_created',
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
      kind: 'bean_order_created',
      notificationLogId: 'bb-bean-created-order-1',
      title: 'คุณเอ',
      summary: 'Ethiopia 250 ก. · Colombia 500 ก.',
      fieldSummary: 'Ethiopia 250 ก. · Colombia 500 ก.',
      url: '/th/bean-orders/order-1',
      orderNo: 'BO-20260722-003',
      customerName: 'คุณเอ',
      recipientName: 'คุณเอ ใจดี',
      lines: [
        { itemName: 'Ethiopia', weightValue: 250, weightUnit: 'g' },
        { itemName: 'Colombia', weightValue: 500, weightUnit: 'g' },
      ],
    },
    ...overrides,
  };
}

describe('bean order created notification helpers', () => {
  test('builds stable notification log id per order', () => {
    expect(beanOrderCreatedNotificationLogId('order-1')).toBe('bb-bean-created-order-1');
  });

  test('formats items summary with bean names and weights only', () => {
    expect(
      formatBeanOrderCreatedItemsSummary([
        { itemName: 'Ethiopia', weightValue: 250, weightUnit: 'g' },
        { itemName: 'Colombia', weightValue: 1, weightUnit: 'kg' },
      ]),
    ).toBe('Ethiopia 250 ก. · Colombia 1 กก.');
  });

  test('prefers linked customer name over recipient name', () => {
    expect(
      resolveBeanOrderCreatedCustomerName({
        customerName: 'คุณเอ',
        recipientName: 'เอ ใจดี',
      }),
    ).toBe('คุณเอ');
    expect(
      resolveBeanOrderCreatedCustomerName({
        customerName: null,
        recipientName: 'เอ ใจดี',
      }),
    ).toBe('เอ ใจดี');
  });

  test('builds copy with customer title and line summary only', () => {
    const copy = buildBeanOrderCreatedCopy(
      {
        orderId: 'order-1',
        orderNo: 'BO-20260722-003',
        customerName: 'คุณเอ',
        recipientName: 'เอ ใจดี',
        lines: [{ itemName: 'Ethiopia', weightValue: 250, weightUnit: 'g' }],
      },
      'th',
    );

    expect(copy.title).toBe('คุณเอ');
    expect(copy.summary).toBe('Ethiopia 250 ก.');
    expect(copy.fieldSummary).toBe('Ethiopia 250 ก.');
  });

  test('eligibility and formatting for bean_order_created logs', () => {
    expect(isEligibleBeanOrderCreatedNotification(sampleRow())).toBe(true);
    expect(
      isEligibleBeanOrderCreatedNotification(
        sampleRow({ module: 'inventory', metadata: { kind: 'bean_order_created' } }),
      ),
    ).toBe(false);
    expect(
      isEligibleBeanOrderCreatedNotification(sampleRow({ metadata: { kind: 'other' } })),
    ).toBe(false);

    const formatted = formatBeanOrderCreatedNotification(sampleRow(), 'th');
    expect(formatted.title).toBe('คุณเอ');
    expect(formatted.summary).toBe('Ethiopia 250 ก. · Colombia 500 ก.');
    expect(formatted.metadata.kind).toBe('bean_order_created');
    expect(formatted.metadata.url).toBe('/th/bean-orders/order-1');
    expect(formatted.logId).toBe('bb-bean-created-order-1');
  });
});
