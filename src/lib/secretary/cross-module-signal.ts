import { countBeanOrderPendingStatuses } from '@/lib/proactive-insights/format-pending-bean-orders';
import { INSIGHT_THRESHOLDS } from '@/lib/proactive-insights/thresholds';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';
import { EMPTY_SECRETARY_COUNT_SESSION } from '@/lib/secretary/types';

/** Gate for AI suggestion pass: cross-module or urgent context only. */
export function hasCrossModuleSignal(
  snapshot: SecretarySnapshot,
  tasks: SecretaryTask[],
): boolean {
  const pendingDerived = tasks.filter(
    (task) =>
      task.source_kind === 'derived' &&
      (task.status === 'pending' || task.status === 'in_progress'),
  );
  const pendingModules = new Set(pendingDerived.map((task) => task.module));

  if (snapshot.isBranch2Day && snapshot.branchWithdrawItems.length > 0) return true;
  if (pendingDerived.length >= 2) return true;
  if (pendingModules.size >= 2) return true;

  if (
    snapshot.maintenanceTasks.some((item) => item.urgency === 'overdue') &&
    snapshot.headcountToday <= 2
  ) {
    return true;
  }

  if (pendingDerived.some((task) => task.priority === 'urgent')) return true;

  const { unpaidCount, pendingShipmentCount } = countBeanOrderPendingStatuses(
    snapshot.operational.pendingBeanOrders,
  );
  if (
    unpaidCount + pendingShipmentCount >= INSIGHT_THRESHOLDS.beanOrdersMinPending &&
    snapshot.itemsToOrder.length > 0
  ) {
    return true;
  }

  const countSession = snapshot.countSession ?? EMPTY_SECRETARY_COUNT_SESSION;
  if (!countSession.isFullyCountedToday) {
    if (countSession.mismatchCount > 0) return true;
    if (countSession.totalExactCountItems > 0) return true;
  }

  if (snapshot.operational.upcomingHoliday && snapshot.operational.upcomingHoliday.daysRemaining <= 3) {
    return true;
  }

  return false;
}
