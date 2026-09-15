import { describe, expect, test } from 'vitest';
import { countSidebarPendingSecretaryTasks } from '@/lib/secretary/count-sidebar-pending-tasks';
import type { SecretaryTask } from '@/lib/secretary/types';

function task(partial: Partial<SecretaryTask> & Pick<SecretaryTask, 'id'>): SecretaryTask {
  return {
    task_type: 'custom',
    title: 't',
    description: null,
    priority: 'normal',
    status: 'pending',
    module: 'custom',
    due_at: null,
    scheduled_date: '2026-09-15',
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
    created_at: '2026-09-15T00:00:00.000Z',
    updated_at: '2026-09-15T00:00:00.000Z',
    ...partial,
  };
}

describe('countSidebarPendingSecretaryTasks', () => {
  const dateIso = '2026-09-15';
  const nowIso = '2026-09-15T12:00:00.000Z';

  test('counts pending and in_progress for the work date', () => {
    const tasks = [
      task({ id: '1', status: 'pending' }),
      task({ id: '2', status: 'in_progress' }),
      task({ id: '3', status: 'done' }),
      task({ id: '4', status: 'pending', scheduled_date: '2026-09-14' }),
    ];
    expect(countSidebarPendingSecretaryTasks(tasks, dateIso, nowIso)).toBe(2);
  });

  test('excludes retired modules and task types like sidebar server count', () => {
    const tasks = [
      task({ id: '1', module: 'branch2' }),
      task({ id: '2', module: 'inventory_count' }),
      task({ id: '3', task_type: 'roast_carry', module: 'schedule' }),
      task({ id: '4', task_type: 'bean_payment_pending', module: 'bean_orders' }),
      task({ id: '5', status: 'pending', module: 'inventory' }),
    ];
    expect(countSidebarPendingSecretaryTasks(tasks, dateIso, nowIso)).toBe(1);
  });

  test('ignores snoozed tasks until snooze expires', () => {
    const tasks = [
      task({ id: '1', snoozed_until: '2026-09-15T13:00:00.000Z' }),
      task({ id: '2', snoozed_until: '2026-09-15T11:00:00.000Z' }),
    ];
    expect(countSidebarPendingSecretaryTasks(tasks, dateIso, nowIso)).toBe(1);
  });
});
