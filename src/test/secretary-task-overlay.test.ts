import { describe, expect, it } from 'vitest';
import { resolveSecretaryTaskOverlayKind } from '@/lib/secretary/resolve-task-overlay';
import type { SecretaryTask } from '@/lib/secretary/types';

function task(partial: Partial<SecretaryTask>): SecretaryTask {
  return {
    id: 'task-1',
    task_type: 'custom',
    title: 'งานทดสอบ',
    description: null,
    priority: 'normal',
    status: 'pending',
    module: 'custom',
    due_at: null,
    scheduled_date: '2026-08-28',
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
    created_at: '2026-08-28T00:00:00.000Z',
    updated_at: '2026-08-28T00:00:00.000Z',
    ...partial,
  };
}

describe('resolveSecretaryTaskOverlayKind', () => {
  it('maps inventory reorder to purchase orders modal', () => {
    expect(
      resolveSecretaryTaskOverlayKind(task({ task_type: 'inventory_reorder', module: 'inventory' })),
    ).toBe('purchase_orders');
  });

  it('maps branch withdraw to branch withdraw panel', () => {
    expect(
      resolveSecretaryTaskOverlayKind(task({ task_type: 'branch_withdraw', module: 'branch_withdraw' })),
    ).toBe('branch_withdraw_panel');
  });

  it('maps bean order tasks to bean list dialog', () => {
    expect(
      resolveSecretaryTaskOverlayKind(task({ task_type: 'bean_payment_pending', module: 'bean_orders' })),
    ).toBe('bean_orders_list');
  });

  it('maps maintenance tasks to maintenance list dialog', () => {
    expect(
      resolveSecretaryTaskOverlayKind(task({ task_type: 'maintenance_overdue', module: 'maintenance' })),
    ).toBe('maintenance_list');
  });

  it('falls back to task info dialog for other task types', () => {
    expect(
      resolveSecretaryTaskOverlayKind(task({ task_type: 'staffing_gap_today', module: 'dashboard' })),
    ).toBe('task_info');
  });
});
