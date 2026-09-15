import {
  formatBeanOrderIncompleteStatusSummary,
  shouldIncludeIncompleteBeanOrder,
} from '@/lib/bean-orders/workflow-status';
import type { PendingBeanOrderInsight } from '@/lib/proactive-insights/types';
import type { SecretaryAttentionListItem } from '@/lib/secretary/task-detail-overlay';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

function matchesLegacyBeanOrderTaskFilter(
  taskType: SecretaryTask['task_type'],
  order: PendingBeanOrderInsight,
): boolean {
  switch (taskType) {
    case 'bean_payment_pending':
      return order.paymentStatus === 'unpaid';
    case 'bean_ship_pending':
      return order.fulfillmentStatus === 'pending';
    case 'bean_tracking_check':
      return order.fulfillmentStatus === 'shipped';
    default:
      return true;
  }
}

export function filterBeanOrdersForSecretaryTask(
  task: Pick<SecretaryTask, 'task_type'>,
  orders: PendingBeanOrderInsight[],
): PendingBeanOrderInsight[] {
  return orders.filter(
    (order) =>
      shouldIncludeIncompleteBeanOrder(order) &&
      matchesLegacyBeanOrderTaskFilter(task.task_type, order),
  );
}

/** Read-only bean order rows for secretary task detail overlay (snapshot only). */
export function buildBeanOrderListItems(
  task: Pick<SecretaryTask, 'id' | 'task_type'>,
  snapshot: Pick<SecretarySnapshot, 'operational'>,
): SecretaryAttentionListItem[] {
  const orders = filterBeanOrdersForSecretaryTask(
    task,
    snapshot.operational.pendingBeanOrders,
  );

  return orders.map((order, index) => ({
    id: `${task.id}-bean-${index}`,
    primary: order.customerName.trim() || 'ลูกค้าไม่ระบุชื่อ',
    secondary: formatBeanOrderIncompleteStatusSummary(order) || undefined,
  }));
}

/** Summary line when list is empty but task description still has context. */
export function resolveBeanOrderListEmptyMessage(
  task: Pick<SecretaryTask, 'description'>,
): string {
  const detail = task.description?.trim();
  if (detail) return detail;
  return 'ไม่มีออเดอร์ที่ต้องติดตามในหมวดนี้';
}
