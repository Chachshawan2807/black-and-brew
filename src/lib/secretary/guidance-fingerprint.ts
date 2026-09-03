import { createHash } from 'node:crypto';
import { isLegacyBeanOrderTaskType } from '@/lib/secretary/bean-order-task-consolidation';
import {
  compareSecretaryBoardTasks,
  isRetiredBranch2RoastTask,
} from '@/lib/secretary/visible-board-tasks';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

export type SecretaryGuidanceSnapshotSlice = Pick<
  SecretarySnapshot,
  'dateIso' | 'isBranch2Day' | 'headcountToday' | 'itemsToOrder' | 'branchWithdrawItems' | 'maintenanceTasks'
>;

function isActionableGuidanceTask(task: SecretaryTask, nowIso: string): boolean {
  if (isLegacyBeanOrderTaskType(task.task_type)) return false;
  if (task.status !== 'pending' && task.status !== 'in_progress') return false;
  if (task.snoozed_until && task.snoozed_until > nowIso) return false;
  return true;
}

export function collectGuidanceTasks(
  tasks: SecretaryTask[],
  nowIso = new Date().toISOString(),
): SecretaryTask[] {
  return tasks
    .filter((task) => isActionableGuidanceTask(task, nowIso))
    .filter((task) => !isRetiredBranch2RoastTask(task))
    .toSorted(compareSecretaryBoardTasks);
}

export function buildSecretaryGuidanceFingerprint(
  tasks: SecretaryTask[],
  snapshot: SecretaryGuidanceSnapshotSlice,
  nowIso = new Date().toISOString(),
): string {
  const actionable = collectGuidanceTasks(tasks, nowIso).map((task) => ({
    id: task.id,
    status: task.status,
    priority: task.priority,
    title: task.title,
    module: task.module,
    task_type: task.task_type,
    due_at: task.due_at,
    snoozed_until: task.snoozed_until,
    active_session_started_at: task.active_session_started_at,
  }));

  const maintenanceOverdue = snapshot.maintenanceTasks.filter((item) => item.urgency === 'overdue').length;

  const payload = JSON.stringify({
    dateIso: snapshot.dateIso,
    isBranch2Day: snapshot.isBranch2Day,
    headcountToday: snapshot.headcountToday,
    itemsToOrderCount: snapshot.itemsToOrder.length,
    branchWithdrawCount: snapshot.branchWithdrawItems.length,
    maintenanceOverdue,
    tasks: actionable,
  });

  return createHash('sha256').update(payload).digest('hex').slice(0, 32);
}
