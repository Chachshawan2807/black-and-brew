import { getBangkokCalendarIso } from '@/lib/date-utils';
import { isLegacyBeanOrderTaskType } from '@/lib/secretary/bean-order-task-consolidation';
import { compareSecretaryTaskOrder } from '@/lib/secretary/task-order-compare';
import type { SecretaryTask } from '@/lib/secretary/types';

export type SecretaryBoardVisibilityOptions = {
  workDateIso: string;
  nowIso?: string;
};

export function isRetiredBranch2RoastTask(task: SecretaryTask): boolean {
  return task.module === 'branch2' || task.task_type === 'roast_carry';
}

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
  if (isRetiredBranch2RoastTask(task)) {
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
  return compareSecretaryTaskOrder(a, b);
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
