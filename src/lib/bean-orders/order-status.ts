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

export function canEditOrderLines(
  fulfillmentStatus: FulfillmentStatus,
  cancelledAt?: string | null,
): boolean {
  return !isOrderCancelled(cancelledAt) && fulfillmentStatus === 'pending';
}

export function canCancelOrder(
  fulfillmentStatus: FulfillmentStatus,
  cancelledAt?: string | null,
): boolean {
  return !isOrderCancelled(cancelledAt) && fulfillmentStatus === 'pending';
}

export function canUploadSlip(
  paymentStatus: PaymentStatus,
  cancelledAt?: string | null,
): boolean {
  return !isOrderCancelled(cancelledAt) && paymentStatus === 'unpaid';
}

export function canConfirmPayment(
  paymentStatus: PaymentStatus,
  cancelledAt?: string | null,
): boolean {
  return !isOrderCancelled(cancelledAt) && paymentStatus === 'unpaid';
}

export function canShip(
  fulfillmentStatus: FulfillmentStatus,
  cancelledAt?: string | null,
): boolean {
  return !isOrderCancelled(cancelledAt) && fulfillmentStatus === 'pending';
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
