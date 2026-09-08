import {
  isBeanOrderDeliveryComplete,
  isBeanOrderPaymentComplete,
} from '@/lib/bean-orders/workflow-status';
import type { PendingBeanOrderInsight } from '@/lib/proactive-insights/types';

export interface BeanOrderPendingCounts {
  unpaidCount: number;
  pendingShipmentCount: number;
}

type BeanOrderPendingCountInput = Pick<
  PendingBeanOrderInsight,
  'paymentStatus' | 'fulfillmentStatus' | 'trackingStatus' | 'slipUploadedAt'
>;

/** Counts incomplete payment and delivery buckets using the same rules as bean-order UI. */
export function countBeanOrderPendingStatuses(
  orders: BeanOrderPendingCountInput[],
): BeanOrderPendingCounts {
  let unpaidCount = 0;
  let pendingShipmentCount = 0;

  for (const order of orders) {
    if (!isBeanOrderPaymentComplete(order)) {
      unpaidCount += 1;
    }
    if (!isBeanOrderDeliveryComplete(order)) {
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
