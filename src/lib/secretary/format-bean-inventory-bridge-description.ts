import {
  countBeanOrderPendingStatuses,
  formatPendingBeanOrdersSummary,
} from '@/lib/proactive-insights/format-pending-bean-orders';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

export function isSecretaryBeanInventoryBridgeTask(task: SecretaryTask): boolean {
  const metadata = task.metadata;
  if (metadata?.insightBridge !== true) return false;
  return metadata.insightRuleId === 'bean_orders_inventory_gap';
}

/** Bean-order backlog + warehouse reorder line for secretary insight-bridge tasks. */
export function formatSecretaryBeanInventoryBridgeDescription(
  snapshot: Pick<SecretarySnapshot, 'operational' | 'itemsToOrder'>,
): string | null {
  const beanSummary = formatPendingBeanOrdersSummary(snapshot.operational.pendingBeanOrders);
  if (!beanSummary) return null;

  return `${beanSummary} · สั่งซื้อคลัง ${snapshot.itemsToOrder.length} รายการ`;
}

export function resolveSecretaryBeanInventoryBridgeSourceRef(
  snapshot: Pick<SecretarySnapshot, 'operational' | 'itemsToOrder'>,
): {
  rule: 'insight_bridge';
  insightRuleId: 'bean_orders_inventory_gap';
  beanPending: number;
  unpaidCount: number;
  pendingShipmentCount: number;
  reorderCount: number;
} {
  const { unpaidCount, pendingShipmentCount } = countBeanOrderPendingStatuses(
    snapshot.operational.pendingBeanOrders,
  );

  return {
    rule: 'insight_bridge',
    insightRuleId: 'bean_orders_inventory_gap',
    beanPending: snapshot.operational.pendingBeanOrders.length,
    unpaidCount,
    pendingShipmentCount,
    reorderCount: snapshot.itemsToOrder.length,
  };
}
