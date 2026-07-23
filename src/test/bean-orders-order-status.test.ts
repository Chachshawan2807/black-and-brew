import { describe, expect, test } from 'vitest';
import {
  appendStatusHistory,
  canCancelOrder,
  canConfirmPayment,
  canEditOrder,
  canEditOrderLines,
  canEditShipment,
  canRevertPayment,
  canShip,
  canUploadSlip,
  getOrderStatusLabel,
} from '@/lib/bean-orders/order-status';

describe('getOrderStatusLabel', () => {
  test('maps dual-axis statuses', () => {
    expect(getOrderStatusLabel('unpaid', 'pending')).toBe('รอชำระ');
    expect(getOrderStatusLabel('paid', 'pending')).toBe('ชำระแล้ว / รอจัดส่ง');
    expect(getOrderStatusLabel('unpaid', 'shipped')).toBe('จัดส่งแล้ว / รอชำระ');
    expect(getOrderStatusLabel('paid', 'shipped')).toBe('เสร็จสมบูรณ์');
  });

  test('cancelled overrides other statuses', () => {
    expect(getOrderStatusLabel('paid', 'shipped', '2026-07-22T00:00:00Z')).toBe('ยกเลิก');
  });
});

describe('action guards', () => {
  const cancelledAt = '2026-07-22T00:00:00Z';

  test('can edit order unless cancelled', () => {
    expect(canEditOrder()).toBe(true);
    expect(canEditOrder(cancelledAt)).toBe(false);
    expect(canEditOrderLines()).toBe(true);
    expect(canEditOrderLines(cancelledAt)).toBe(false);
    expect(canEditShipment()).toBe(true);
    expect(canEditShipment(cancelledAt)).toBe(false);
  });

  test('can cancel only before shipped', () => {
    expect(canCancelOrder('pending')).toBe(true);
    expect(canCancelOrder('shipped')).toBe(false);
    expect(canCancelOrder('pending', cancelledAt)).toBe(false);
  });

  test('payment actions stay available until cancelled', () => {
    expect(canUploadSlip()).toBe(true);
    expect(canUploadSlip(cancelledAt)).toBe(false);
    expect(canConfirmPayment('unpaid')).toBe(true);
    expect(canConfirmPayment('paid')).toBe(false);
    expect(canRevertPayment('paid')).toBe(true);
    expect(canRevertPayment('unpaid')).toBe(false);
  });

  test('can ship only when pending fulfillment', () => {
    expect(canShip('pending')).toBe(true);
    expect(canShip('shipped')).toBe(false);
    expect(canShip('pending', cancelledAt)).toBe(false);
  });
});

describe('appendStatusHistory', () => {
  test('appends entry with ISO timestamp', () => {
    const next = appendStatusHistory([], {
      by: 'staff-a',
      action: 'created',
      payment_status: 'unpaid',
      fulfillment_status: 'pending',
    });
    expect(next).toHaveLength(1);
    expect(next[0].by).toBe('staff-a');
    expect(next[0].at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
