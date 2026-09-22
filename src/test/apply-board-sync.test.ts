import { describe, expect, test } from 'vitest';
import { applySecretaryBoardSync } from '@/lib/secretary/apply-board-sync';
import { buildMinimalSecretaryBoardSnapshot } from '@/lib/secretary/minimal-board-snapshot';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

function task(id: string): SecretaryTask {
  return {
    id,
    task_type: 'custom',
    title: id,
    description: null,
    priority: 'normal',
    status: 'pending',
    module: 'custom',
    due_at: null,
    scheduled_date: '2026-09-23',
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
    created_at: '2026-09-23T00:00:00.000Z',
    updated_at: '2026-09-23T00:00:00.000Z',
  };
}

function readySnapshot(): SecretarySnapshot {
  return {
    ...buildMinimalSecretaryBoardSnapshot('2026-09-23', 'th'),
    detailStatus: 'ready',
    itemsToOrder: [{ id: 'milk', name: 'นม' } as never],
    maintenanceTasks: [{ id: 'oven', equipment: 'เตาอบ' } as never],
  };
}

describe('applySecretaryBoardSync', () => {
  test('task refresh keeps detail that is already on the board', () => {
    const prev = {
      tasks: [task('old')],
      snapshot: readySnapshot(),
    };

    const next = applySecretaryBoardSync(prev, { tasks: [task('new')] });

    expect(next.tasks.map((entry) => entry.id)).toEqual(['new']);
    expect(next.snapshot).toBe(prev.snapshot);
  });

  test('a deferred snapshot does not replace ready card detail', () => {
    const prev = {
      tasks: [task('old')],
      snapshot: readySnapshot(),
    };

    const next = applySecretaryBoardSync(prev, {
      tasks: [task('new')],
      snapshot: buildMinimalSecretaryBoardSnapshot('2026-09-23', 'th'),
    });

    expect(next.tasks.map((entry) => entry.id)).toEqual(['new']);
    expect(next.snapshot.itemsToOrder).toEqual(prev.snapshot.itemsToOrder);
  });

  test('a detail patch merges onto the current snapshot', () => {
    const prev = {
      tasks: [task('task')],
      snapshot: readySnapshot(),
    };

    const next = applySecretaryBoardSync(prev, {
      snapshotPatch: {
        dateIso: '2026-09-23',
        locale: 'th',
        itemsToOrder: [{ id: 'sugar', name: 'น้ำตาล' } as never],
      },
    });

    expect(next.snapshot.itemsToOrder).toEqual([{ id: 'sugar', name: 'น้ำตาล' }]);
    expect(next.snapshot.maintenanceTasks).toEqual(prev.snapshot.maintenanceTasks);
    expect(next.tasks).toBe(prev.tasks);
  });

  test('a full ready snapshot replaces a deferred board', () => {
    const full = readySnapshot();
    const next = applySecretaryBoardSync(
      {
        tasks: [task('old')],
        snapshot: buildMinimalSecretaryBoardSnapshot('2026-09-23', 'th'),
      },
      { tasks: [task('new')], snapshot: full },
    );

    expect(next.snapshot).toBe(full);
    expect(next.tasks.map((entry) => entry.id)).toEqual(['new']);
  });
});
