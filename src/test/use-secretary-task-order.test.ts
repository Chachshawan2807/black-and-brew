import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSecretaryTaskOrder } from '@/hooks/use-secretary-task-order';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

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

const snapshot: SecretarySnapshot = {
  dateIso: '2026-08-29',
  locale: 'th',
  operational: {} as SecretarySnapshot['operational'],
  itemsToOrder: [],
  branchWithdrawItems: [],
  maintenanceTasks: [],
  isBranch2Day: false,
  headcountToday: 4,
};

describe('useSecretaryTaskOrder', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('returns fallback immediately without fetch when only one actionable task', () => {
    const { result } = renderHook(() =>
      useSecretaryTaskOrder({
        tasks: [task({ id: 'only', title: 'งานเดียว' })],
        snapshot,
        aiOrderingEnabled: true,
      }),
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.source).toBe('fallback');
    expect(fetch).not.toHaveBeenCalled();
  });

  test('skips fetch when AI ordering is disabled', () => {
    const { result } = renderHook(() =>
      useSecretaryTaskOrder({
        tasks: [
          task({ id: 'a', title: 'งาน A' }),
          task({ id: 'b', title: 'งาน B' }),
        ],
        snapshot,
        aiOrderingEnabled: false,
      }),
    );

    expect(result.current.loading).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  test('updates guidance when tasks change and AI ordering is off', () => {
    const initial = [task({ id: 'a', title: 'งาน A' }), task({ id: 'b', title: 'งาน B' })];
    const { result, rerender } = renderHook(
      ({ tasks }) =>
        useSecretaryTaskOrder({
          tasks,
          snapshot,
          aiOrderingEnabled: false,
        }),
      { initialProps: { tasks: initial } },
    );

    expect(result.current.guidanceText).toContain('งาน A');

    rerender({
      tasks: [
        task({ id: 'a', title: 'งาน A', status: 'done', completed_at: '2026-08-29T09:00:00.000Z' }),
        task({ id: 'b', title: 'งาน B' }),
      ],
    });

    expect(result.current.guidanceText).not.toContain('งาน A');
    expect(result.current.guidanceText).toContain('งาน B');
  });
});
