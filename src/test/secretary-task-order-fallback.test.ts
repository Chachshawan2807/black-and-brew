import { describe, expect, test } from 'vitest';
import { buildFallbackTaskOrder } from '@/lib/secretary/task-order-fallback';
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

describe('buildFallbackTaskOrder', () => {
  test('pins in_progress task first', () => {
    const ordered = buildFallbackTaskOrder([
      task({ id: 'b', title: 'งาน B' }),
      task({
        id: 'a',
        title: 'งาน A',
        status: 'in_progress',
        active_session_started_at: '2026-08-29T01:00:00.000Z',
      }),
    ]);

    expect(ordered.map((item) => item.id)).toEqual(['a', 'b']);
  });

  test('excludes completed tasks', () => {
    const ordered = buildFallbackTaskOrder([
      task({ id: 'done', status: 'done', completed_at: '2026-08-29T08:00:00.000Z' }),
      task({ id: 'next', title: 'งานถัดไป' }),
    ]);

    expect(ordered).toHaveLength(1);
    expect(ordered[0]?.id).toBe('next');
  });

  test('orders purchase reorder before maintenance even when maintenance is urgent', () => {
    const ordered = buildFallbackTaskOrder(
      [
        task({
          id: 'maintenance',
          title: 'ซ่อมบำรุงเลยกำหนด (3)',
          task_type: 'maintenance_overdue',
          module: 'maintenance',
          priority: 'urgent',
        }),
        task({
          id: 'purchase',
          title: 'สั่งซื้อสินค้า (9 รายการ)',
          task_type: 'inventory_reorder',
          module: 'inventory',
          priority: 'normal',
        }),
      ],
      '2026-08-29T10:00:00.000Z',
    );

    expect(ordered.map((item) => item.id)).toEqual(['purchase', 'maintenance']);
  });
});
