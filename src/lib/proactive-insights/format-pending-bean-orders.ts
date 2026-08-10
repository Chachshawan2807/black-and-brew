import type { PendingBeanOrderInsight } from '@/lib/proactive-insights/types';

export interface BeanOrderPendingCounts {
  unpaidCount: number;
  pendingShipmentCount: number;
}

/** Counts actionable payment/shipment queues (excludes legacy unpaid+shipped orders). */
export function countBeanOrderPendingStatuses(
  orders: Pick<PendingBeanOrderInsight, 'paymentStatus' | 'fulfillmentStatus'>[],
): BeanOrderPendingCounts {
  let unpaidCount = 0;
  let pendingShipmentCount = 0;

  for (const order of orders) {
    if (order.paymentStatus === 'unpaid' && order.fulfillmentStatus === 'pending') {
      unpaidCount += 1;
    }
    if (order.fulfillmentStatus === 'pending') {
      pendingShipmentCount += 1;
    }
  }

  return { unpaidCount, pendingShipmentCount };
}

/** Compact summary: payment and shipment counts on one line. */
export function formatPendingBeanOrdersSummary(orders: PendingBeanOrderInsight[]): string {
  const { unpaidCount, pendingShipmentCount } = countBeanOrderPendingStatuses(orders);
  const parts: string[] = [];

  if (unpaidCount > 0) {
    parts.push(`ค้างชำระเงิน ${unpaidCount} รายการ`);
  }
  if (pendingShipmentCount > 0) {
    parts.push(`ค้างจัดส่ง ${pendingShipmentCount} รายการ`);
  }

  return parts.join(' · ');
}
