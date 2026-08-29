import { getBangkokCalendarIso } from '@/lib/date-utils';
import { isLegacyBeanOrderTaskType } from '@/lib/secretary/bean-order-task-consolidation';
import type { SecretaryTask } from '@/lib/secretary/types';

const BOARD_STATUS_RANK: Record<SecretaryTask['status'], number> = {
  in_progress: 0,
  pending: 1,
  done: 2,
  skipped: 3,
};

export type SecretaryBoardVisibilityOptions = {
  workDateIso: string;
  nowIso?: string;
};

export function isSecretaryBoardTaskVisible(
  task: SecretaryTask,
  moduleFilter: 'all' | SecretaryTask['module'],
  options: SecretaryBoardVisibilityOptions,
): boolean {
  const nowIso = options.nowIso ?? new Date().toISOString();
  const { workDateIso } = options;

  if (isLegacyBeanOrderTaskType(task.task_type)) {
    return false;
  }
  if (task.status !== 'pending' && task.status !== 'in_progress' && task.status !== 'done') {
    return false;
  }
  if (
    task.status === 'done' &&
    task.completed_at &&
    getBangkokCalendarIso(new Date(task.completed_at)) < workDateIso
  ) {
    return false;
  }
  if (task.status !== 'done' && task.snoozed_until && task.snoozed_until > nowIso) {
    return false;
  }
  if (moduleFilter !== 'all' && task.module !== moduleFilter) {
    return false;
  }
  return true;
}

export function compareSecretaryBoardTasks(a: SecretaryTask, b: SecretaryTask): number {
  const rankDiff = BOARD_STATUS_RANK[a.status] - BOARD_STATUS_RANK[b.status];
  if (rankDiff !== 0) return rankDiff;

  const priorityRank = { urgent: 0, normal: 1, low: 2 } as const;
  const priorityDiff = priorityRank[a.priority] - priorityRank[b.priority];
  if (priorityDiff !== 0) return priorityDiff;

  return a.created_at.localeCompare(b.created_at);
}

export function filterVisibleSecretaryBoardTasks(
  tasks: SecretaryTask[],
  moduleFilter: 'all' | SecretaryTask['module'],
  options: SecretaryBoardVisibilityOptions,
): SecretaryTask[] {
  return tasks
    .filter((task) => isSecretaryBoardTaskVisible(task, moduleFilter, options))
    .toSorted(compareSecretaryBoardTasks);
}

export function countSecretaryBoardTasksByModule(
  tasks: SecretaryTask[],
  module: SecretaryTask['module'],
  options: SecretaryBoardVisibilityOptions,
): number {
  return tasks.filter((task) => isSecretaryBoardTaskVisible(task, module, options)).length;
}
