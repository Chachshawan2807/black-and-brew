import type { SecretaryTask } from '@/lib/secretary/types';

export function buildPendingManualSecretaryTask(input: {
  id: string;
  title: string;
  description?: string;
  scheduledDate: string;
  nowIso?: string;
}): SecretaryTask {
  const now = input.nowIso ?? new Date().toISOString();
  const description = input.description?.trim() ? input.description.trim() : null;
  return {
    id: input.id,
    task_type: 'custom',
    title: input.title,
    description,
    priority: 'normal',
    status: 'pending',
    module: 'custom',
    due_at: null,
    scheduled_date: input.scheduledDate,
    assignee_profile_id: null,
    source_kind: 'manual',
    source_ref: null,
    source_ref_hash: null,
    action_href: null,
    metadata: null,
    completed_at: null,
    completed_by: null,
    snoozed_until: null,
    active_session_started_at: null,
    created_at: now,
    updated_at: now,
  };
}
