import { describe, expect, test } from 'vitest';
import {
  appendStatusHistory,
  canCancelOrder,
  canConfirmPayment,
  canEditOrderLines,
  canShip,
  canUploadSlip,
  getOrderStatusLabel,
} from '@/lib/bean-orders/order-status';

describe('getOrderStatusLabel', () => {
  test('maps dual-axis statuses', () => {
    expect(getOrderStatusLabel('unpaid', 'pending')).toBe('รอชำระ');
    expect(getOrderStatusLabel('paid', 'pending')).toBe('ชำระแล้ว · รอจัดส่ง');
    expect(getOrderStatusLabel('unpaid', 'shipped')).toBe('จัดส่งแล้ว · รอชำระ');
    expect(getOrderStatusLabel('paid', 'shipped')).toBe('เสร็จสมบูรณ์');
  });

  test('cancelled overrides other statuses', () => {
    expect(getOrderStatusLabel('paid', 'shipped', '2026-07-22T00:00:00Z')).toBe('ยกเลิก');
  });
});

describe('action guards', () => {
  test('can edit lines only before shipped', () => {
    expect(canEditOrderLines('pending')).toBe(true);
    expect(canEditOrderLines('shipped')).toBe(false);
    expect(canEditOrderLines('pending', '2026-07-22T00:00:00Z')).toBe(false);
  });

  test('can cancel only before shipped', () => {
    expect(canCancelOrder('pending')).toBe(true);
    expect(canCancelOrder('shipped')).toBe(false);
  });

  test('payment actions require unpaid and not cancelled', () => {
    expect(canUploadSlip('unpaid')).toBe(true);
    expect(canUploadSlip('paid')).toBe(false);
    expect(canConfirmPayment('unpaid')).toBe(true);
    expect(canConfirmPayment('paid')).toBe(false);
  });

  test('can ship only when pending fulfillment', () => {
    expect(canShip('pending')).toBe(true);
    expect(canShip('shipped')).toBe(false);
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
