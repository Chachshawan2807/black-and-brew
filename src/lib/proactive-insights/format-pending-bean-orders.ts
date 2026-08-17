import type { PendingBeanOrderInsight } from '@/lib/proactive-insights/types';
import { isBeanOrderPaymentSettled } from '@/lib/bean-orders/order-status';

export interface BeanOrderPendingCounts {
  unpaidCount: number;
  pendingShipmentCount: number;
}

function isAwaitingPayment(
  order: Pick<PendingBeanOrderInsight, 'paymentStatus' | 'fulfillmentStatus' | 'slipUploadedAt'>,
): boolean {
  return (
    !isBeanOrderPaymentSettled(order.paymentStatus, order.slipUploadedAt) &&
    order.fulfillmentStatus === 'pending'
  );
}

/** Counts actionable payment and shipment queues (excludes legacy unpaid+shipped orders). */
export function countBeanOrderPendingStatuses(
  orders: Pick<
    PendingBeanOrderInsight,
    'paymentStatus' | 'fulfillmentStatus' | 'trackingStatus' | 'slipUploadedAt'
  >[],
): BeanOrderPendingCounts {
  let unpaidCount = 0;
  let pendingShipmentCount = 0;

  for (const order of orders) {
    if (isAwaitingPayment(order)) {
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
