import { describe, expect, test } from 'vitest';
import { orderedTasksFromIds, sortTasksByGlobalOrder } from '@/lib/secretary/apply-task-order';
import { validateAiTaskOrder } from '@/lib/secretary/task-order-quality';
import type { SecretaryTask } from '@/lib/secretary/types';

function task(overrides: Partial<SecretaryTask> = {}): SecretaryTask {
  return {
    id: overrides.id ?? 'task-1',
    task_type: 'custom',
    title: overrides.title ?? 'งานทดสอบ',
    description: null,
    priority: overrides.priority ?? 'normal',
    status: overrides.status ?? 'pending',
    module: 'custom',
    due_at: null,
    scheduled_date: '2026-08-29',
    assignee_profile_id: null,
    source_kind: 'manual',
    source_ref: null,
    source_ref_hash: null,
    action_href: null,
    metadata: null,
    completed_at: null,
    completed_by: null,
    snoozed_until: null,
    active_session_started_at: overrides.active_session_started_at ?? null,
    created_at: '2026-08-29T00:00:00.000Z',
    updated_at: '2026-08-29T00:00:00.000Z',
    ...overrides,
  };
}

describe('validateAiTaskOrder', () => {
  const actionable = [
    task({ id: 'a', status: 'in_progress', active_session_started_at: '2026-08-29T01:00:00.000Z' }),
    task({ id: 'b' }),
    task({ id: 'c' }),
  ];

  test('accepts a full permutation with in_progress first', () => {
    expect(
      validateAiTaskOrder({
        orderedIds: ['a', 'c', 'b'],
        actionableTasks: actionable,
      }),
    ).toBe(true);
  });

  test('rejects missing or extra ids', () => {
    expect(
      validateAiTaskOrder({
        orderedIds: ['a', 'b'],
        actionableTasks: actionable,
      }),
    ).toBe(false);
    expect(
      validateAiTaskOrder({
        orderedIds: ['a', 'b', 'c', 'x'],
        actionableTasks: actionable,
      }),
    ).toBe(false);
  });

  test('rejects in_progress not first', () => {
    expect(
      validateAiTaskOrder({
        orderedIds: ['b', 'a', 'c'],
        actionableTasks: actionable,
      }),
    ).toBe(false);
  });
});

describe('sortTasksByGlobalOrder', () => {
  test('keeps done tasks after actionable order', () => {
    const tasks = [
      task({ id: 'done', status: 'done', completed_at: '2026-08-29T08:00:00.000Z' }),
      task({ id: 'b', title: 'B' }),
      task({ id: 'a', title: 'A' }),
    ];

    const sorted = sortTasksByGlobalOrder(tasks, ['a', 'b']);
    expect(sorted.map((item) => item.id)).toEqual(['a', 'b', 'done']);
  });

  test('orderedTasksFromIds preserves AI order', () => {
    const actionable = [task({ id: 'a' }), task({ id: 'b' })];
    expect(orderedTasksFromIds(actionable, ['b', 'a']).map((item) => item.id)).toEqual(['b', 'a']);
  });
});
