import { isManualSecretaryTask } from '@/lib/secretary/is-manual-task';
import type { SecretaryTask } from '@/lib/secretary/types';

function isOpenManualTaskForWorkDay(task: SecretaryTask, workDateIso: string): boolean {
  if (!isManualSecretaryTask(task)) return false;
  if (task.status !== 'pending' && task.status !== 'in_progress') return false;
  if (task.scheduled_date > workDateIso) return false;
  return true;
}

/** Preserve open manual tasks when a board refresh omits them (race or stale fetch). */
export function mergeSecretaryBoardTasksAfterSync(
  previousTasks: readonly SecretaryTask[],
  incomingTasks: readonly SecretaryTask[],
  workDateIso: string,
): SecretaryTask[] {
  const byId = new Map<string, SecretaryTask>();
  for (const task of incomingTasks) {
    byId.set(task.id, task);
  }

  for (const task of previousTasks) {
    if (byId.has(task.id)) continue;
    if (!isOpenManualTaskForWorkDay(task, workDateIso)) continue;
    byId.set(task.id, task);
  }

  return [...byId.values()];
}
