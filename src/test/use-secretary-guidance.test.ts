import { describe, expect, test } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSecretaryGuidance } from '@/hooks/use-secretary-guidance';
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

describe('useSecretaryGuidance', () => {
  test('returns summary guidance synchronously without loading', () => {
    const tasks = [
      task({ id: 'a', title: 'งาน A' }),
      task({ id: 'b', title: 'งาน B' }),
    ];
    const { result } = renderHook(() => useSecretaryGuidance({ tasks, snapshot }));

    expect(result.current.loading).toBe(false);
    expect(result.current.text).toContain('2 งาน');
    expect(result.current.text).toContain('งาน A');
    expect(result.current.text).not.toContain('แล้วต่อด้วย');
  });

  test('updates guidance immediately when a task is completed', () => {
    const pending = [
      task({ id: 'a', title: 'งาน A' }),
      task({ id: 'b', title: 'งาน B' }),
    ];
    const { result, rerender } = renderHook(
      ({ tasks }) => useSecretaryGuidance({ tasks, snapshot }),
      { initialProps: { tasks: pending } },
    );

    expect(result.current.text).toContain('งาน A');

    rerender({
      tasks: [
        task({ id: 'a', title: 'งาน A', status: 'done', completed_at: '2026-08-29T09:00:00.000Z' }),
        task({ id: 'b', title: 'งาน B' }),
      ],
    });

    expect(result.current.text).not.toContain('2 งาน');
    expect(result.current.text).toContain('งาน B');
  });
});
