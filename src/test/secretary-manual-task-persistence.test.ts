import { describe, expect, test } from 'vitest';
import { applySecretaryBoardSync } from '@/lib/secretary/apply-board-sync';
import { boardTaskConsolidationKey, consolidateSecretaryBoardTasks } from '@/lib/secretary/consolidate-board-tasks';
import { mergeSecretaryBoardTasksAfterSync } from '@/lib/secretary/merge-board-tasks-after-sync';
import { buildMinimalSecretaryBoardSnapshot } from '@/lib/secretary/minimal-board-snapshot';
import type { SecretaryTask } from '@/lib/secretary/types';

function manualTask(
  partial: Partial<SecretaryTask> & Pick<SecretaryTask, 'id'>,
): SecretaryTask {
  return {
    task_type: 'custom',
    title: partial.title ?? partial.id,
    description: null,
    priority: 'normal',
    status: 'pending',
    module: 'custom',
    due_at: null,
    scheduled_date: partial.scheduled_date ?? '2026-08-29',
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
    created_at: '2026-08-29T00:00:00.000Z',
    updated_at: '2026-08-29T00:00:00.000Z',
    ...partial,
  };
}

describe('mergeSecretaryBoardTasksAfterSync', () => {
  test('keeps open manual tasks missing from a stale server refresh', () => {
    const localOnly = manualTask({ id: 'manual-local', scheduled_date: '2026-08-29' });
    const server = manualTask({ id: 'derived-like', title: 'สั่งซื้อ', module: 'inventory', task_type: 'inventory_reorder', source_kind: 'derived' });

    const merged = mergeSecretaryBoardTasksAfterSync(
      [localOnly],
      [server as SecretaryTask],
      '2026-08-29',
    );

    expect(merged.map((task) => task.id).toSorted()).toEqual(['derived-like', 'manual-local']);
  });

  test('does not resurrect a manual task the user deleted locally', () => {
    const deleted = manualTask({ id: 'gone', status: 'skipped' });
    const merged = mergeSecretaryBoardTasksAfterSync([], [deleted], '2026-08-29');
    expect(merged).toEqual([deleted]);
  });

  test('drops carried manual tasks scheduled after the work day', () => {
    const future = manualTask({ id: 'future', scheduled_date: '2026-08-30' });
    const merged = mergeSecretaryBoardTasksAfterSync([future], [], '2026-08-29');
    expect(merged).toEqual([]);
  });
});

describe('applySecretaryBoardSync manual task merge', () => {
  test('task refresh keeps open manual tasks not yet in server payload', () => {
    const prev = {
      tasks: [manualTask({ id: 'keep-me' })],
      snapshot: buildMinimalSecretaryBoardSnapshot('2026-08-29', 'th'),
    };

    const next = applySecretaryBoardSync(prev, { tasks: [] });

    expect(next.tasks.map((task) => task.id)).toEqual(['keep-me']);
  });
});

describe('boardTaskConsolidationKey for manual tasks', () => {
  test('does not merge separate manual tasks that share a title', () => {
    const a = manualTask({ id: 'a', title: 'เช็คคลัง' });
    const b = manualTask({ id: 'b', title: 'เช็คคลัง' });

    expect(boardTaskConsolidationKey(a)).not.toBe(boardTaskConsolidationKey(b));
    expect(consolidateSecretaryBoardTasks([a, b])).toHaveLength(2);
  });
});
