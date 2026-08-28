import { formatBeanOrdersBoardTaskTitle } from '@/lib/secretary/bean-order-task-consolidation';
import { shouldIncludeIncompleteBeanOrder } from '@/lib/bean-orders/workflow-status';
import { buildSourceRefHash } from '@/lib/secretary/source-ref-hash';
import type { DerivedTaskDraft, SecretarySnapshot } from '@/lib/secretary/types';

export function deriveBeanOrderTasks(snapshot: SecretarySnapshot): DerivedTaskDraft[] {
  const localePrefix = `/${snapshot.locale}`;
  const incomplete = snapshot.operational.pendingBeanOrders.filter((order) =>
    shouldIncludeIncompleteBeanOrder(order),
  );

  if (incomplete.length === 0) {
    return [];
  }

  const sourceRef = { rule: 'bean_orders_incomplete' };
  return [
    {
      taskType: 'bean_orders_pending',
      title: formatBeanOrdersBoardTaskTitle(incomplete.length),
      description: incomplete.map((o) => o.customerName).slice(0, 5).join(', '),
      priority: 'normal',
      module: 'bean_orders',
      sourceRef,
      sourceRefHash: buildSourceRefHash('bean_orders_pending', sourceRef),
      actionHref: `${localePrefix}/bean-orders`,
      estimatedMinutes: 20,
    },
  ];
}
