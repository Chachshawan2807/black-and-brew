import { isTrackingDeliveredStatus } from '@/lib/bean-orders/delivery-notification';
import type {
  FulfillmentStatus,
  PaymentStatus,
  StatusHistoryEntry,
} from './types';

export type OrderStatusLabel =
  | 'รอชำระ'
  | 'ชำระแล้ว / รอจัดส่ง'
  | 'จัดส่งแล้ว / รอชำระ'
  | 'เสร็จสมบูรณ์'
  | 'ยกเลิก';

export function getOrderStatusLabel(
  paymentStatus: PaymentStatus,
  fulfillmentStatus: FulfillmentStatus,
  cancelledAt?: string | null,
): OrderStatusLabel {
  if (cancelledAt) return 'ยกเลิก';
  if (paymentStatus === 'unpaid' && fulfillmentStatus === 'pending') return 'รอชำระ';
  if (paymentStatus === 'paid' && fulfillmentStatus === 'pending') return 'ชำระแล้ว / รอจัดส่ง';
  if (paymentStatus === 'unpaid' && fulfillmentStatus === 'shipped') return 'จัดส่งแล้ว / รอชำระ';
  return 'เสร็จสมบูรณ์';
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

export function canCancelOrder(
  fulfillmentStatus: FulfillmentStatus,
  cancelledAt?: string | null,
): boolean {
  return canEditOrder(cancelledAt) && fulfillmentStatus === 'pending';
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

/** Shipped orders without a tracking number — staff confirms delivery manually. */
export function canConfirmManualDelivery(
  fulfillmentStatus: FulfillmentStatus,
  trackingNumber: string | null | undefined,
  trackingStatus: string | null | undefined,
  cancelledAt?: string | null,
): boolean {
  if (!canEditOrder(cancelledAt)) return false;
  if (fulfillmentStatus !== 'shipped') return false;
  if (trackingNumber?.trim()) return false;
  if (isTrackingDeliveredStatus(trackingStatus)) return false;
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
