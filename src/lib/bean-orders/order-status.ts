import { isTrackingDeliveredStatus } from '@/lib/bean-orders/delivery-notification';
import {
  hasBeanOrderSavedTrackingNumber,
  isBeanOrderShipmentWorkflowClosed,
} from '@/lib/bean-orders/shipment-deliver-ui';
import type {
  FulfillmentStatus,
  PaymentStatus,
  StatusHistoryEntry,
} from './types';

export const ORDER_PAYMENT_BADGE_LABEL = 'ชำระแล้ว' as const;
export const ORDER_SHIPMENT_BADGE_LABEL = 'จัดส่งแล้ว' as const;
/** @deprecated Use ORDER_SHIPMENT_BADGE_LABEL */
export const ORDER_DELIVERY_BADGE_LABEL = ORDER_SHIPMENT_BADGE_LABEL;

export function shouldShowOrderPaymentBadge(
  slipUploadedAt: string | null | undefined,
  paymentStatus?: PaymentStatus,
  cancelledAt?: string | null,
): boolean {
  if (cancelledAt) return false;
  return isBeanOrderPaymentSettled(paymentStatus, slipUploadedAt);
}

/** Matches list/detail UI: slip uploaded counts as payment handled even before confirm. */
export function isBeanOrderPaymentSettled(
  paymentStatus?: PaymentStatus | string | null,
  slipUploadedAt?: string | null,
): boolean {
  return paymentStatus === 'paid' || Boolean(slipUploadedAt);
}

export function shouldShowOrderShipmentBadge(input: {
  fulfillmentStatus?: FulfillmentStatus | string | null;
  trackingNumber?: string | null;
  trackingStatus?: string | null;
  cancelledAt?: string | null;
}): boolean {
  return isBeanOrderShipmentWorkflowClosed({
    fulfillmentStatus: input.fulfillmentStatus,
    trackingNumber: input.trackingNumber,
    trackingStatus: input.trackingStatus,
    cancelledAt: input.cancelledAt,
  });
}

/** @deprecated Pass fulfillment + trackingNumber via shouldShowOrderShipmentBadge */
export function shouldShowOrderDeliveryBadge(
  trackingStatus: string | null | undefined,
  cancelledAt?: string | null,
  fulfillmentStatus?: FulfillmentStatus | string | null,
  trackingNumber?: string | null,
): boolean {
  return shouldShowOrderShipmentBadge({
    trackingStatus,
    cancelledAt,
    fulfillmentStatus,
    trackingNumber,
  });
}

export function isOrderCancelled(cancelledAt?: string | null): boolean {
  return Boolean(cancelledAt);
}

/** Non-cancelled orders can be edited at any workflow step. */
export function canEditOrder(cancelledAt?: string | null): boolean {
  return !isOrderCancelled(cancelledAt);
}

export function canEditOrderLines(cancelledAt?: string | null): boolean {
  return canEditOrder(cancelledAt);
}

/** Pending (not yet shipped) orders can be hard-deleted. */
export function canDeleteOrder(fulfillmentStatus: FulfillmentStatus): boolean {
  return fulfillmentStatus === 'pending';
}

/** @deprecated Prefer canDeleteOrder same guard for hard delete. */
export function canCancelOrder(fulfillmentStatus: FulfillmentStatus): boolean {
  return canDeleteOrder(fulfillmentStatus);
}

export function canUploadSlip(cancelledAt?: string | null): boolean {
  return canEditOrder(cancelledAt);
}

export function canConfirmPayment(
  paymentStatus: PaymentStatus,
  cancelledAt?: string | null,
): boolean {
  return canEditOrder(cancelledAt) && paymentStatus === 'unpaid';
}

/** Confirm-payment CTA stays clickable only before a slip is uploaded. */
export function isConfirmPaymentButtonEnabled(hasSlip: boolean): boolean {
  return !hasSlip;
}

/** True only when a slip file was uploaded (not payment confirm alone). */
export function hasBeanOrderUploadedSlip(input: {
  slipUploadedAt?: string | null;
  pendingSlipPreview?: string | null;
  pendingSlipFile?: File | null;
}): boolean {
  return Boolean(
    input.pendingSlipPreview ||
      input.pendingSlipFile ||
      input.slipUploadedAt,
  );
}

export function canRevertPayment(
  paymentStatus: PaymentStatus,
  cancelledAt?: string | null,
): boolean {
  return canEditOrder(cancelledAt) && paymentStatus === 'paid';
}

export function canEditShipment(cancelledAt?: string | null): boolean {
  return canEditOrder(cancelledAt);
}

export function canShip(
  fulfillmentStatus: FulfillmentStatus,
  cancelledAt?: string | null,
): boolean {
  return canEditShipment(cancelledAt) && fulfillmentStatus === 'pending';
}

/**
 * จัดส่งสำเร็จ: ปิดงานเมื่อลูกค้าได้รับของ (รับเอง ฯลฯ).
 * ซ่อนเมื่อมีเลขพัสดุบันทึกในระบบแล้ว (พัสดุจบงานโดยไม่ต้องกด) หรือยืนยันสำเร็จแล้ว.
 */
export function shouldShowDeliveredButton(
  _fulfillmentStatus: FulfillmentStatus,
  trackingStatus: string | null | undefined,
  savedTrackingNumber?: string | null,
  cancelledAt?: string | null,
): boolean {
  if (!canEditOrder(cancelledAt)) return false;
  if (isTrackingDeliveredStatus(trackingStatus)) return false;
  if (hasBeanOrderSavedTrackingNumber(savedTrackingNumber)) return false;
  return true;
}

export function canConfirmDelivered(
  fulfillmentStatus: FulfillmentStatus,
  trackingStatus: string | null | undefined,
  cancelledAt?: string | null,
): boolean {
  if (!canEditOrder(cancelledAt)) return false;
  if (isTrackingDeliveredStatus(trackingStatus)) return false;
  if (fulfillmentStatus !== 'shipped' && fulfillmentStatus !== 'pending') return false;
  return true;
}

export function appendStatusHistory(
  history: StatusHistoryEntry[],
  entry: Omit<StatusHistoryEntry, 'at'> & { at?: string },
): StatusHistoryEntry[] {
  return [
    ...history,
    {
      ...entry,
      at: entry.at ?? new Date().toISOString(),
    },
  ];
}
