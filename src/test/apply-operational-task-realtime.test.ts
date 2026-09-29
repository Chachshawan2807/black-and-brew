import { describe, expect, test } from 'vitest';
import { applyOperationalTaskRealtime } from '@/lib/secretary/apply-operational-task-realtime';
import type { SecretaryTask } from '@/lib/secretary/types';

function task(overrides: Partial<SecretaryTask> = {}): SecretaryTask {
  return {
    id: 'task-1',
    task_type: 'custom',
    title: 'Open shop',
    description: null,
    priority: 'normal',
    status: 'pending',
    module: 'schedule',
    due_at: null,
    scheduled_date: '2026-09-29',
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
    created_at: '2026-09-29T01:00:00.000Z',
    updated_at: '2026-09-29T01:00:00.000Z',
    ...overrides,
  };
}

describe('applyOperationalTaskRealtime', () => {
  test('updates an existing card immediately', () => {
    const next = applyOperationalTaskRealtime([task()], 'UPDATE', {
      ...task({ status: 'done', title: 'Opened' }),
    });
    expect(next?.[0]?.status).toBe('done');
    expect(next?.[0]?.title).toBe('Opened');
  });

  test('appends a new card and drops a deleted one', () => {
    const inserted = applyOperationalTaskRealtime([], 'INSERT', { ...task() });
    expect(inserted).toHaveLength(1);
    expect(applyOperationalTaskRealtime(inserted ?? [], 'DELETE', { id: 'task-1' })).toEqual([]);
  });

  test('skips a partial row so the server refresh stays the source', () => {
    expect(applyOperationalTaskRealtime([task()], 'UPDATE', { id: 'task-1' })).toBeNull();
  });
});
