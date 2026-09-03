import type { SecretaryWorkdayPhase } from '@/lib/secretary/task-order-time-context';
import { resolveWorkSession } from '@/lib/secretary/task-work-sessions';
import type { SecretaryTask } from '@/lib/secretary/types';

const STATUS_RANK: Record<SecretaryTask['status'], number> = {
  in_progress: 0,
  pending: 1,
  done: 2,
  skipped: 3,
};

const PRIORITY_RANK: Record<SecretaryTask['priority'], number> = {
  urgent: 0,
  normal: 1,
  low: 2,
};

function taskOrderKindRank(task: SecretaryTask, phase: SecretaryWorkdayPhase): number {
  if (task.source_kind === 'ai_suggested') {
    return task.priority === 'urgent' ? 0 : 1;
  }

  if (
    (task.module === 'schedule' || task.module === 'dashboard') &&
    task.priority === 'urgent'
  ) {
    return 20;
  }

  if (task.task_type === 'inventory_reorder') return 30;
  if (task.task_type === 'branch_withdraw') return 40;
  if (task.module === 'bean_orders') return 50;

  if (task.task_type === 'maintenance_overdue' || task.task_type === 'maintenance_due') {
    return phase === 'near_close' ? 55 : 60;
  }
  if (task.module === 'maintenance') return 65;

  return 80;
}

function compareWithinWorkSession(a: SecretaryTask, b: SecretaryTask): number | null {
  const sessionA = resolveWorkSession(a);
  const sessionB = resolveWorkSession(b);
  if (!sessionA || !sessionB || sessionA.id !== sessionB.id) return null;

  const typeOrderA = sessionA.taskTypes.indexOf(a.task_type);
  const typeOrderB = sessionB.taskTypes.indexOf(b.task_type);
  if (typeOrderA !== typeOrderB) return typeOrderA - typeOrderB;

  return null;
}

export function compareSecretaryTaskOrder(
  a: SecretaryTask,
  b: SecretaryTask,
  phase: SecretaryWorkdayPhase = 'open_hours',
): number {
  const statusDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
  if (statusDiff !== 0) return statusDiff;

  const kindDiff = taskOrderKindRank(a, phase) - taskOrderKindRank(b, phase);
  if (kindDiff !== 0) return kindDiff;

  const withinSession = compareWithinWorkSession(a, b);
  if (withinSession !== null) return withinSession;

  const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (priorityDiff !== 0) return priorityDiff;

  return a.created_at.localeCompare(b.created_at);
}
