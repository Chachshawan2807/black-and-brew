export {
  formatBeanOrderIncompleteStatusLines,
  formatBeanOrderIncompleteStatusSummary,
} from '@/lib/bean-orders/workflow-status';

import {
  formatBeanOrderIncompleteStatusLines,
  formatBeanOrderIncompleteStatusSummary,
  shouldIncludeIncompleteBeanOrder,
  type BeanOrderWorkflowStatusInput,
} from '@/lib/bean-orders/workflow-status';
import type { PendingBeanOrderInsight } from '@/lib/proactive-insights/types';

/** @deprecated Use formatBeanOrderIncompleteStatusSummary */
export function formatBeanOrderPendingDetailSummary(
  order: Pick<
    PendingBeanOrderInsight,
    'paymentStatus' | 'fulfillmentStatus' | 'slipUploadedAt' | 'trackingStatus'
  >,
): string {
  return formatBeanOrderIncompleteStatusSummary(order);
}

export function resolvePendingBeanOrderStatusLabel(
  paymentStatus: string,
  fulfillmentStatus: string,
  slipUploadedAt?: string | null,
  trackingStatus?: string | null,
): string | null {
  const order: BeanOrderWorkflowStatusInput = {
    paymentStatus,
    fulfillmentStatus,
    slipUploadedAt,
    trackingStatus,
  };
  if (!shouldIncludeIncompleteBeanOrder(order)) return null;

  const shortLabels = formatBeanOrderIncompleteStatusLines(order).map((line) => {
    if (line.includes('ค้างชำระ')) return 'ค้างชำระเงิน';
    if (line.includes('รอจัดส่ง') || line.includes('ส่งแล้ว')) return 'ค้างจัดส่ง';
    return line;
  });

  return shortLabels.length > 0 ? shortLabels.join(', ') : null;
}
