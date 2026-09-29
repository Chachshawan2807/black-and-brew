import type { SecretaryTask, SecretaryTaskPriority, SecretaryTaskStatus } from '@/lib/secretary/types';

export type OperationalTaskRealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

function mapOperationalTaskRow(row: Record<string, unknown>): SecretaryTask | null {
  if (typeof row.id !== 'string' || !row.id) return null;
  if (typeof row.title !== 'string') return null;
  if (typeof row.scheduled_date !== 'string') return null;
  if (typeof row.created_at !== 'string' || typeof row.updated_at !== 'string') return null;

  return {
    id: row.id,
    task_type: row.task_type as SecretaryTask['task_type'],
    title: row.title,
    description: row.description ? String(row.description) : null,
    priority: row.priority as SecretaryTaskPriority,
    status: row.status as SecretaryTaskStatus,
    module: row.module as SecretaryTask['module'],
    due_at: row.due_at ? String(row.due_at) : null,
    scheduled_date: row.scheduled_date,
    assignee_profile_id: row.assignee_profile_id ? String(row.assignee_profile_id) : null,
    source_kind: row.source_kind as SecretaryTask['source_kind'],
    source_ref: (row.source_ref as Record<string, unknown>) ?? null,
    source_ref_hash: row.source_ref_hash ? String(row.source_ref_hash) : null,
    action_href: row.action_href ? String(row.action_href) : null,
    metadata: (row.metadata as Record<string, unknown>) ?? null,
    completed_at: row.completed_at ? String(row.completed_at) : null,
    completed_by: row.completed_by ? String(row.completed_by) : null,
    snoozed_until: row.snoozed_until ? String(row.snoozed_until) : null,
    active_session_started_at: row.active_session_started_at
      ? String(row.active_session_started_at)
      : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Paint a postgres change on the current board before the server refresh returns. */
export function applyOperationalTaskRealtime(
  tasks: readonly SecretaryTask[],
  eventType: OperationalTaskRealtimeEvent,
  record: Record<string, unknown> | null | undefined,
): SecretaryTask[] | null {
  if (eventType === 'DELETE') {
    const id = typeof record?.id === 'string' ? record.id : null;
    if (!id) return null;
    return tasks.filter((task) => task.id !== id);
  }

  const mapped = record ? mapOperationalTaskRow(record) : null;
  if (!mapped) return null;

  const index = tasks.findIndex((task) => task.id === mapped.id);
  if (index === -1) return [...tasks, mapped];

  const next = tasks.slice();
  next[index] = mapped;
  return next;
}
