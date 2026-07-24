import { describe, expect, test } from 'vitest';
import {
  appendStatusHistory,
  canCancelOrder,
  canConfirmManualDelivery,
  canConfirmPayment,
  canEditOrder,
  canEditOrderLines,
  canEditShipment,
  canRevertPayment,
  canShip,
  canUploadSlip,
  ORDER_DELIVERY_BADGE_LABEL,
  ORDER_PAYMENT_BADGE_LABEL,
  shouldShowOrderDeliveryBadge,
  shouldShowOrderPaymentBadge,
} from '@/lib/bean-orders/order-status';

describe('order status badges', () => {
  test('shows payment badge only after slip upload', () => {
    expect(shouldShowOrderPaymentBadge(null)).toBe(false);
    expect(shouldShowOrderPaymentBadge('2026-07-22T10:30:00.000Z')).toBe(true);
    expect(shouldShowOrderPaymentBadge('2026-07-22T10:30:00.000Z', '2026-07-22T00:00:00Z')).toBe(false);
  });

  test('shows delivery badge only when tracking is delivered', () => {
    expect(shouldShowOrderDeliveryBadge(null)).toBe(false);
    expect(shouldShowOrderDeliveryBadge('in_transit')).toBe(false);
    expect(shouldShowOrderDeliveryBadge('delivered')).toBe(true);
    expect(shouldShowOrderDeliveryBadge('delivered', '2026-07-22T00:00:00Z')).toBe(false);
  });

  test('uses fixed badge labels', () => {
    expect(ORDER_PAYMENT_BADGE_LABEL).toBe('ชำระแล้ว');
    expect(ORDER_DELIVERY_BADGE_LABEL).toBe('จัดส่งสำเร็จ');
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

  test('can confirm manual delivery only for shipped orders without tracking', () => {
    expect(canConfirmManualDelivery('shipped', null, null)).toBe(true);
    expect(canConfirmManualDelivery('shipped', '', null)).toBe(true);
    expect(canConfirmManualDelivery('shipped', '  ', 'in_transit')).toBe(true);
    expect(canConfirmManualDelivery('shipped', 'KEX123', null)).toBe(false);
    expect(canConfirmManualDelivery('pending', null, null)).toBe(false);
    expect(canConfirmManualDelivery('shipped', null, 'delivered')).toBe(false);
    expect(canConfirmManualDelivery('shipped', null, null, cancelledAt)).toBe(false);
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
