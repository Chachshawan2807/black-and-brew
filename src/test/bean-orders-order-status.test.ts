import { describe, expect, test } from 'vitest';
import {
  appendStatusHistory,
  canConfirmDelivered,
  canConfirmManualDelivery,
  canConfirmPayment,
  canDeleteOrder,
  canEditOrder,
  canEditOrderLines,
  canEditShipment,
  canRevertPayment,
  canShip,
  canUploadSlip,
  isConfirmPaymentButtonEnabled,
  ORDER_DELIVERY_BADGE_LABEL,
  ORDER_PAYMENT_BADGE_LABEL,
  shouldShowDeliveredButton,
  shouldShowAutoTrackingBadge,
  shouldShowOrderDeliveryBadge,
  shouldShowOrderPaymentBadge,
} from '@/lib/bean-orders/order-status';

describe('order status badges', () => {
  test('shows payment badge after slip upload or payment confirmation', () => {
    expect(shouldShowOrderPaymentBadge(null)).toBe(false);
    expect(shouldShowOrderPaymentBadge(null, 'paid')).toBe(true);
    expect(shouldShowOrderPaymentBadge('2026-07-22T10:30:00.000Z')).toBe(true);
    expect(shouldShowOrderPaymentBadge('2026-07-22T10:30:00.000Z', 'paid', '2026-07-22T00:00:00Z')).toBe(false);
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

  test('can delete only before shipped', () => {
    expect(canDeleteOrder('pending')).toBe(true);
    expect(canDeleteOrder('shipped')).toBe(false);
    // Soft-cancelled leftovers (cancelled_at set) can still be hard-deleted while pending
    expect(canDeleteOrder('pending', cancelledAt)).toBe(true);
  });

  test('payment actions stay available until cancelled', () => {
    expect(canUploadSlip()).toBe(true);
    expect(canUploadSlip(cancelledAt)).toBe(false);
    expect(canConfirmPayment('unpaid')).toBe(true);
    expect(canConfirmPayment('paid')).toBe(false);
    expect(canRevertPayment('paid')).toBe(true);
    expect(canRevertPayment('unpaid')).toBe(false);
  });

  test('confirm payment button is clickable only before slip upload', () => {
    expect(isConfirmPaymentButtonEnabled(false)).toBe(true);
    expect(isConfirmPaymentButtonEnabled(true)).toBe(false);
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

  test('can confirm delivered for any shipped order not yet delivered', () => {
    expect(canConfirmDelivered('shipped', null)).toBe(true);
    expect(canConfirmDelivered('shipped', 'in_transit')).toBe(true);
    expect(canConfirmDelivered('shipped', 'delivered')).toBe(false);
    expect(canConfirmDelivered('pending', null)).toBe(false);
    expect(canConfirmDelivered('shipped', null, cancelledAt)).toBe(false);
  });

  test('shows delivered button for pending and shipped until delivered', () => {
    expect(shouldShowDeliveredButton('pending', null)).toBe(true);
    expect(shouldShowDeliveredButton('shipped', 'in_transit')).toBe(true);
    expect(shouldShowDeliveredButton('shipped', 'delivered')).toBe(false);
    expect(shouldShowDeliveredButton('pending', null, null, cancelledAt)).toBe(false);
    expect(shouldShowDeliveredButton('shipped', null, 'KEX123', null, 'kerryexpress-th')).toBe(false);
    expect(shouldShowDeliveredButton('shipped', null, 'LM123', null, 'lalamove')).toBe(true);
  });

  test('shows auto tracking badge when tracking number is present', () => {
    expect(shouldShowAutoTrackingBadge('shipped', null, 'KEX123', null, 'kerryexpress-th')).toBe(true);
    expect(shouldShowAutoTrackingBadge('pending', null, 'KEX123', null, 'kerryexpress-th')).toBe(true);
    expect(shouldShowAutoTrackingBadge('shipped', null, null, null, 'kerryexpress-th')).toBe(false);
    expect(shouldShowAutoTrackingBadge('shipped', 'delivered', 'KEX123', null, 'kerryexpress-th')).toBe(false);
    expect(shouldShowAutoTrackingBadge('shipped', null, 'LM123', null, 'lalamove')).toBe(false);
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
