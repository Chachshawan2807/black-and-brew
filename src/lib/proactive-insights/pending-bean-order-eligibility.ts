import { isTrackingDeliveredStatus } from '@/lib/bean-orders/delivery-notification';

export type BeanOrderInsightStatus = {
  paymentStatus: string;
  fulfillmentStatus: string;
  trackingStatus?: string | null;
};

/** Orders that still need staff action in proactive insight alerts. */
export function shouldIncludeBeanOrderInPendingInsights(order: BeanOrderInsightStatus): boolean {
  if (isTrackingDeliveredStatus(order.trackingStatus)) return false;
  if (order.paymentStatus === 'unpaid') return true;
  if (order.fulfillmentStatus === 'pending') return true;
  if (order.paymentStatus === 'paid' && order.fulfillmentStatus === 'shipped') return true;
  return false;
}

export function isAwaitingBeanOrderDelivery(order: BeanOrderInsightStatus): boolean {
  return (
    order.paymentStatus === 'paid' &&
    order.fulfillmentStatus === 'shipped' &&
    !isTrackingDeliveredStatus(order.trackingStatus)
  );
}
