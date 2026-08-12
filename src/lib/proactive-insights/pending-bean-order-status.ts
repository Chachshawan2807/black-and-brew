import { isTrackingDeliveredStatus } from '@/lib/bean-orders/delivery-notification';

/** Thai label for a bean order that still needs staff action. */
export function resolvePendingBeanOrderStatusLabel(
  paymentStatus: string,
  fulfillmentStatus: string,
  trackingStatus?: string | null,
): string | null {
  if (paymentStatus === 'unpaid') return 'ค้างชำระเงิน';
  if (fulfillmentStatus === 'pending') return 'ค้างจัดส่ง';
  if (
    paymentStatus === 'paid' &&
    fulfillmentStatus === 'shipped' &&
    !isTrackingDeliveredStatus(trackingStatus)
  ) {
    return 'รอส่งมอบ';
  }
  return null;
}
