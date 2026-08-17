import { isTrackingDeliveredStatus } from '@/lib/bean-orders/delivery-notification';
import { isTrackableCarrierCode } from '@/lib/bean-orders/carriers';
import type {
  FulfillmentStatus,
  PaymentStatus,
  StatusHistoryEntry,
} from './types';

export const ORDER_PAYMENT_BADGE_LABEL = 'ชำระแล้ว' as const;
export const ORDER_DELIVERY_BADGE_LABEL = 'จัดส่งสำเร็จ' as const;

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

export function shouldShowOrderDeliveryBadge(
  trackingStatus: string | null | undefined,
  cancelledAt?: string | null,
): boolean {
  if (cancelledAt) return false;
  return isTrackingDeliveredStatus(trackingStatus);
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
export function canDeleteOrder(
  fulfillmentStatus: FulfillmentStatus,
  _cancelledAt?: string | null,
): boolean {
  return fulfillmentStatus === 'pending';
}

/** @deprecated Prefer canDeleteOrder — same guard for hard delete. */
export function canCancelOrder(
  fulfillmentStatus: FulfillmentStatus,
  cancelledAt?: string | null,
): boolean {
  return canDeleteOrder(fulfillmentStatus, cancelledAt);
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

/** Manual จัดส่งสำเร็จ CTA — only when TrackingMore will not auto-update. */
export function shouldShowDeliveredButton(
  fulfillmentStatus: FulfillmentStatus,
  trackingStatus: string | null | undefined,
  trackingNumber?: string | null,
  cancelledAt?: string | null,
  carrierCode?: string | null,
): boolean {
  return getDeliveryActionMode(fulfillmentStatus, trackingStatus, trackingNumber, cancelledAt, carrierCode) === 'manual';
}

/** Grey ระบบอัตโนมัติ label — trackable carrier + tracking number; TrackingMore updates delivery. */
export function shouldShowAutoTrackingBadge(
  fulfillmentStatus: FulfillmentStatus,
  trackingStatus: string | null | undefined,
  trackingNumber?: string | null,
  cancelledAt?: string | null,
  carrierCode?: string | null,
): boolean {
  return getDeliveryActionMode(fulfillmentStatus, trackingStatus, trackingNumber, cancelledAt, carrierCode) === 'auto';
}

export type DeliveryActionMode = 'manual' | 'auto' | 'hidden';

export function getDeliveryActionMode(
  fulfillmentStatus: FulfillmentStatus,
  trackingStatus: string | null | undefined,
  trackingNumber?: string | null,
  cancelledAt?: string | null,
  carrierCode?: string | null,
): DeliveryActionMode {
  if (!canEditOrder(cancelledAt)) return 'hidden';
  if (isTrackingDeliveredStatus(trackingStatus)) return 'hidden';
  if (fulfillmentStatus !== 'pending' && fulfillmentStatus !== 'shipped') return 'hidden';
  if (trackingNumber?.trim() && isTrackableCarrierCode(carrierCode)) return 'auto';
  return 'manual';
}

/** Shipped orders not yet delivered — staff can mark จัดส่งสำเร็จ. */
export function canConfirmDelivered(
  fulfillmentStatus: FulfillmentStatus,
  trackingStatus: string | null | undefined,
  cancelledAt?: string | null,
): boolean {
  if (!canEditOrder(cancelledAt)) return false;
  if (fulfillmentStatus !== 'shipped') return false;
  if (isTrackingDeliveredStatus(trackingStatus)) return false;
  return true;
}

/** Shipped orders without a tracking number — staff confirms delivery manually. */
export function canConfirmManualDelivery(
  fulfillmentStatus: FulfillmentStatus,
  trackingNumber: string | null | undefined,
  trackingStatus: string | null | undefined,
  cancelledAt?: string | null,
): boolean {
  if (!canConfirmDelivered(fulfillmentStatus, trackingStatus, cancelledAt)) return false;
  if (trackingNumber?.trim()) return false;
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
