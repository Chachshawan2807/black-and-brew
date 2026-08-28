import { formatShipmentTrackingLabel } from '@/lib/bean-orders/tracking-status-labels';
import {
  shouldShowOrderDeliveryBadge,
  shouldShowOrderPaymentBadge,
} from '@/lib/bean-orders/order-status';
import type { FulfillmentStatus, PaymentStatus } from '@/lib/bean-orders/types';

export type BeanOrderWorkflowStatusInput = {
  paymentStatus?: PaymentStatus | string | null;
  fulfillmentStatus?: FulfillmentStatus | string | null;
  trackingStatus?: string | null;
  slipUploadedAt?: string | null;
  cancelledAt?: string | null;
};

export function isBeanOrderPaymentComplete(order: BeanOrderWorkflowStatusInput): boolean {
  return shouldShowOrderPaymentBadge(
    order.slipUploadedAt,
    order.paymentStatus as PaymentStatus | undefined,
    order.cancelledAt,
  );
}

export function isBeanOrderDeliveryComplete(order: BeanOrderWorkflowStatusInput): boolean {
  return shouldShowOrderDeliveryBadge(order.trackingStatus, order.cancelledAt);
}

/** Both payment and delivery match the completed badges in bean-order list UI. */
export function isBeanOrderWorkflowComplete(order: BeanOrderWorkflowStatusInput): boolean {
  return isBeanOrderPaymentComplete(order) && isBeanOrderDeliveryComplete(order);
}

/** Secretary / insights: include until both workflow badges would show. */
export function shouldIncludeIncompleteBeanOrder(order: BeanOrderWorkflowStatusInput): boolean {
  if (order.cancelledAt) return false;
  return !isBeanOrderWorkflowComplete(order);
}

/** Labels for statuses that are not yet complete — inverse of OrderListStatusGroup badges. */
export function formatBeanOrderIncompleteStatusLines(
  order: BeanOrderWorkflowStatusInput,
): string[] {
  const lines: string[] = [];

  if (!isBeanOrderPaymentComplete(order)) {
    lines.push('ชำระเงิน: ค้างชำระ');
  }

  if (!isBeanOrderDeliveryComplete(order)) {
    if (order.fulfillmentStatus === 'pending') {
      lines.push('จัดส่ง: รอจัดส่ง');
    } else {
      const shipmentLabel = formatShipmentTrackingLabel(order.trackingStatus, {
        fulfillmentStatus: order.fulfillmentStatus as FulfillmentStatus | undefined,
      });
      lines.push(shipmentLabel ? `จัดส่ง: ${shipmentLabel}` : 'จัดส่ง: รอจัดส่ง');
    }
  }

  return lines;
}

export function formatBeanOrderIncompleteStatusSummary(
  order: BeanOrderWorkflowStatusInput,
): string {
  return formatBeanOrderIncompleteStatusLines(order).join(' · ');
}
