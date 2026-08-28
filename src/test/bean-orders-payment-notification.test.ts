import { describe, expect, test } from 'vitest';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import {
  beanOrderPaymentNotificationLogId,
  formatBeanOrderPaymentNotification,
  formatBeanOrderPaymentSummary,
  isEligibleBeanOrderPaymentNotification,
} from '@/lib/bean-orders/payment-notification';

function sampleRow(overrides: Partial<DataChangeLogRow> = {}): DataChangeLogRow {
  return {
    id: 'log-1',
    occurred_at: '2026-07-22T12:00:00.000Z',
    actor_id: null,
    actor_label: 'ระบบชำระเงิน',
    actor_access_level: 'system',
    action: 'UPDATE',
    module: 'bean_orders',
    entity_type: 'bean_order_payment',
    entity_id: 'order-1',
    entity_label: 'BO-20260722-3',
    field_changes: [],
    old_value: null,
    new_value: null,
    source: 'system',
    ip_address: null,
    user_agent: null,
    status: 'success',
    error_message: null,
    metadata: {
      kind: 'bean_order_payment_confirmed',
      notificationLogId: 'bb-bean-paid-order-1',
      title: 'ชำระแล้ว',
      summary: 'คุณเอ · 800 บาท',
      fieldSummary: 'คุณเอ · 800 บาท',
      url: '/th/bean-orders/order-1',
      orderNo: 'BO-20260722-3',
      customerName: 'คุณเอ',
      totalBaht: 800,
    },
    ...overrides,
  };
}

describe('bean order payment notification helpers', () => {
  test('builds stable notification log id per order', () => {
    expect(beanOrderPaymentNotificationLogId('order-1')).toBe('bb-bean-paid-order-1');
  });

  test('formats payment summary as customer name plus total', () => {
    expect(formatBeanOrderPaymentSummary('คุณเอ', 800)).toBe('คุณเอ · 800 บาท');
    expect(formatBeanOrderPaymentSummary(null, null)).toBe('ลูกค้า');
  });

  test('eligibility and formatting for bean_order_payment_confirmed logs', () => {
    expect(isEligibleBeanOrderPaymentNotification(sampleRow())).toBe(true);
    expect(
      isEligibleBeanOrderPaymentNotification(
        sampleRow({ module: 'inventory', metadata: { kind: 'bean_order_payment_confirmed' } }),
      ),
    ).toBe(false);
    expect(
      isEligibleBeanOrderPaymentNotification(sampleRow({ metadata: { kind: 'other' } })),
    ).toBe(false);

    const formatted = formatBeanOrderPaymentNotification(sampleRow(), 'th');
    expect(formatted.title).toBe('ชำระแล้ว');
    expect(formatted.summary).toBe('คุณเอ · 800 บาท');
    expect(formatted.metadata.kind).toBe('bean_order_payment_confirmed');
    expect(formatted.metadata.url).toBe('/th/bean-orders/order-1');
    expect(formatted.logId).toBe('bb-bean-paid-order-1');
  });
});
