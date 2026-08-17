import { isTrackingDeliveredStatus } from '@/lib/bean-orders/delivery-notification';

export type BeanOrderInsightStatus = {
  paymentStatus: string;
  fulfillmentStatus: string;
  trackingStatus?: string | null;
  slipUploadedAt?: string | null;
};

/** Orders that still need staff action in proactive insight alerts. */
export function shouldIncludeBeanOrderInPendingInsights(order: BeanOrderInsightStatus): boolean {
  if (isTrackingDeliveredStatus(order.trackingStatus)) return false;
  if (order.paymentStatus === 'unpaid' && !order.slipUploadedAt) return true;
  if (order.fulfillmentStatus === 'pending') return true;
  return false;
}
