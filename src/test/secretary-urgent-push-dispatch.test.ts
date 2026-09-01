import { describe, expect, test } from 'vitest';
import {
  resolveNewUrgentTaskIds,
  shouldDispatchUrgentPush,
} from '@/lib/secretary/alerts/urgent-push-dispatch';
import type { SecretaryTask } from '@/lib/secretary/types';

function urgentTask(id: string, overrides: Partial<SecretaryTask> = {}): SecretaryTask {
  return {
    id,
    task_type: 'custom',
    title: `งานเร่ง ${id}`,
    description: null,
    priority: 'urgent',
    status: 'pending',
    module: 'custom',
    due_at: null,
    scheduled_date: '2026-08-29',
    assignee_profile_id: null,
    source_kind: 'derived',
    source_ref: null,
    source_ref_hash: null,
    action_href: null,
    metadata: null,
    completed_at: null,
    completed_by: null,
    snoozed_until: null,
    active_session_started_at: null,
    created_at: '2026-08-29T00:00:00.000Z',
    updated_at: '2026-08-29T00:00:00.000Z',
    ...overrides,
  };
}

describe('secretary urgent push dispatch', () => {
  test('returns only new urgent task ids not previously pushed', () => {
    const tasks = [
      urgentTask('u1'),
      urgentTask('u2'),
      urgentTask('n1', { priority: 'normal' }),
      urgentTask('done', { status: 'done' }),
    ];
    expect(resolveNewUrgentTaskIds(tasks, ['u1'])).toEqual(['u2']);
  });

  test('respects cooldown until timestamp', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(
      shouldDispatchUrgentPush(['new-id'], {
        pushedTaskIds: [],
        pushedAt: null,
        cooldownUntil: future,
      }),
    ).toBe(false);

    const past = new Date(Date.now() - 60_000).toISOString();
    expect(
      shouldDispatchUrgentPush(['new-id'], {
        pushedTaskIds: [],
        pushedAt: null,
        cooldownUntil: past,
      }),
    ).toBe(true);
  });

  test('skips when no new urgent tasks', () => {
    expect(
      shouldDispatchUrgentPush([], {
        pushedTaskIds: ['u1'],
        pushedAt: null,
        cooldownUntil: null,
      }),
    ).toBe(false);
  });
});
