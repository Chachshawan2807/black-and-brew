import type { PendingBeanOrderInsight } from '@/lib/proactive-insights/types';
import { isAwaitingBeanOrderDelivery } from '@/lib/proactive-insights/pending-bean-order-eligibility';

export interface BeanOrderPendingCounts {
  unpaidCount: number;
  pendingShipmentCount: number;
  awaitingDeliveryCount: number;
}

/** Counts actionable payment/shipment/delivery queues (excludes legacy unpaid+shipped orders). */
export function countBeanOrderPendingStatuses(
  orders: Pick<PendingBeanOrderInsight, 'paymentStatus' | 'fulfillmentStatus' | 'trackingStatus'>[],
): BeanOrderPendingCounts {
  let unpaidCount = 0;
  let pendingShipmentCount = 0;
  let awaitingDeliveryCount = 0;

  for (const order of orders) {
    if (order.paymentStatus === 'unpaid' && order.fulfillmentStatus === 'pending') {
      unpaidCount += 1;
    }
    if (order.fulfillmentStatus === 'pending') {
      pendingShipmentCount += 1;
    }
    if (isAwaitingBeanOrderDelivery(order)) {
      awaitingDeliveryCount += 1;
    }
  }

  return { unpaidCount, pendingShipmentCount, awaitingDeliveryCount };
}

/** Compact summary: payment, shipment, and delivery counts on one line. */
export function formatPendingBeanOrdersSummary(orders: PendingBeanOrderInsight[]): string {
  const { unpaidCount, pendingShipmentCount, awaitingDeliveryCount } =
    countBeanOrderPendingStatuses(orders);
  const parts: string[] = [];

  if (unpaidCount > 0) {
    parts.push(`ค้างชำระเงิน ${unpaidCount} รายการ`);
  }
  if (pendingShipmentCount > 0) {
    parts.push(`ค้างจัดส่ง ${pendingShipmentCount} รายการ`);
  }
  if (awaitingDeliveryCount > 0) {
    parts.push(`รอส่งมอบ ${awaitingDeliveryCount} รายการ`);
  }

  return parts.join(' · ');
}
