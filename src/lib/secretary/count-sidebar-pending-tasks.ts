import type { SecretaryTask } from '@/lib/secretary/types';

const SIDEBAR_PENDING_EXCLUDED_MODULES = new Set<SecretaryTask['module']>([
  'branch2',
  'inventory_count',
  'inventory_accuracy',
]);

const SIDEBAR_PENDING_EXCLUDED_TASK_TYPES = new Set<SecretaryTask['task_type']>([
  'roast_carry',
  'inventory_count_due',
  'inventory_accuracy_review',
  'bean_payment_pending',
  'bean_ship_pending',
  'bean_tracking_check',
]);

/** Mirrors `countPendingSecretaryTasks` in home-actions for sidebar badge. */
export function countSidebarPendingSecretaryTasks(
  tasks: readonly SecretaryTask[],
  dateIso: string,
  nowIso: string = new Date().toISOString(),
): number {
  let count = 0;
  for (const task of tasks) {
    if (task.scheduled_date !== dateIso) continue;
    if (task.status !== 'pending' && task.status !== 'in_progress') continue;
    if (SIDEBAR_PENDING_EXCLUDED_MODULES.has(task.module)) continue;
    if (SIDEBAR_PENDING_EXCLUDED_TASK_TYPES.has(task.task_type)) continue;
    if (task.snoozed_until && task.snoozed_until > nowIso) continue;
    count += 1;
  }
  return count;
}
