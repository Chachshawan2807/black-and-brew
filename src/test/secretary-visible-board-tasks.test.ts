import { describe, expect, test } from 'vitest';
import {
  compareSecretaryBoardTasks,
  countSecretaryBoardTasksByModule,
  filterVisibleSecretaryBoardTasks,
} from '@/lib/secretary/visible-board-tasks';
import type { SecretaryTask } from '@/lib/secretary/types';

function task(partial: Partial<SecretaryTask> & Pick<SecretaryTask, 'id' | 'status'>): SecretaryTask {
  return {
    task_type: 'custom',
    title: partial.id,
    description: null,
    priority: 'normal',
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
    active_session_started_at: null,
    created_at: '2026-08-29T00:00:00.000Z',
    updated_at: '2026-08-29T00:00:00.000Z',
    ...partial,
  };
}

describe('filterVisibleSecretaryBoardTasks', () => {
  const visibility = { workDateIso: '2026-08-29' };

  test('keeps completed tasks visible on the board for the current work day', () => {
    const visible = filterVisibleSecretaryBoardTasks(
      [
        task({ id: 'pending', status: 'pending' }),
        task({
          id: 'done',
          status: 'done',
          completed_at: '2026-08-29T10:00:00.000Z',
          metadata: { totalActualSeconds: 90 },
        }),
        task({ id: 'skipped', status: 'skipped' }),
      ],
      'all',
      visibility,
    );

    expect(visible.map((entry) => entry.id)).toEqual(['pending', 'done']);
  });

  test('hides tasks completed on a previous work day when viewing a new day', () => {
    const visible = filterVisibleSecretaryBoardTasks(
      [
        task({ id: 'done-yesterday', status: 'done', completed_at: '2026-08-28T15:00:00.000Z' }),
        task({ id: 'done-today', status: 'done', completed_at: '2026-08-29T10:00:00.000Z' }),
        task({ id: 'pending', status: 'pending' }),
      ],
      'all',
      visibility,
    );

    expect(visible.map((entry) => entry.id)).toEqual(['pending', 'done-today']);
  });

  test('sorts in-progress before pending before done', () => {
    const visible = filterVisibleSecretaryBoardTasks(
      [
        task({ id: 'done', status: 'done', completed_at: '2026-08-29T10:00:00.000Z' }),
        task({ id: 'pending', status: 'pending' }),
        task({ id: 'active', status: 'in_progress', active_session_started_at: '2026-08-29T01:00:00.000Z' }),
      ],
      'all',
      visibility,
    );

    expect(visible.map((entry) => entry.id)).toEqual(['active', 'pending', 'done']);
  });

  test('counts completed tasks in module filters for the current work day only', () => {
    const tasks = [
      task({ id: 'inventory-pending', status: 'pending', module: 'inventory' }),
      task({
        id: 'inventory-done',
        status: 'done',
        module: 'inventory',
        completed_at: '2026-08-29T10:00:00.000Z',
      }),
      task({
        id: 'inventory-done-yesterday',
        status: 'done',
        module: 'inventory',
        completed_at: '2026-08-28T10:00:00.000Z',
      }),
    ];

    expect(countSecretaryBoardTasksByModule(tasks, 'inventory', visibility)).toBe(2);
  });

  test('hides legacy split bean-order task types from the board', () => {
    const visible = filterVisibleSecretaryBoardTasks(
      [
        task({ id: 'unified', status: 'pending', module: 'bean_orders', task_type: 'bean_orders_pending' }),
        task({ id: 'legacy-payment', status: 'pending', module: 'bean_orders', task_type: 'bean_payment_pending' }),
        task({ id: 'legacy-ship', status: 'done', module: 'bean_orders', task_type: 'bean_ship_pending' }),
      ],
      'all',
      visibility,
    );

    expect(visible.map((entry) => entry.id)).toEqual(['unified']);
  });

  test('hides branch2 roast tasks when focus staff is not on branch 2 today', () => {
    const roastTask = task({
      id: 'roast',
      status: 'done',
      module: 'branch2',
      task_type: 'roast_carry',
      title: 'คั่วกาแฟ',
      completed_at: '2026-08-29T10:00:00.000Z',
    });

    const visible = filterVisibleSecretaryBoardTasks(
      [roastTask, task({ id: 'inventory', status: 'pending', module: 'inventory' })],
      'all',
      { ...visibility, isBranch2Day: false },
    );

    expect(visible.map((entry) => entry.id)).toEqual(['inventory']);
  });

  test('shows branch2 roast tasks only on branch 2 days', () => {
    const roastTask = task({
      id: 'roast',
      status: 'pending',
      module: 'branch2',
      task_type: 'roast_carry',
      title: 'คั่วกาแฟ',
    });

    const visible = filterVisibleSecretaryBoardTasks(
      [roastTask],
      'all',
      { ...visibility, isBranch2Day: true },
    );

    expect(visible.map((entry) => entry.id)).toEqual(['roast']);
  });
});

describe('compareSecretaryBoardTasks', () => {
  test('orders urgent tasks before normal within the same status', () => {
    const ordered = [
      task({ id: 'normal', status: 'pending', priority: 'normal' }),
      task({ id: 'urgent', status: 'pending', priority: 'urgent' }),
    ].toSorted(compareSecretaryBoardTasks);

    expect(ordered.map((entry) => entry.id)).toEqual(['urgent', 'normal']);
  });
});
