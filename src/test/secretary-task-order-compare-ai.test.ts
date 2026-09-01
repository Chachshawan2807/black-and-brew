import { describe, expect, test } from 'vitest';
import { compareSecretaryTaskOrder } from '@/lib/secretary/task-order-compare';
import type { SecretaryTask } from '@/lib/secretary/types';

function task(overrides: Partial<SecretaryTask> = {}): SecretaryTask {
  return {
    id: overrides.id ?? 'task-1',
    task_type: overrides.task_type ?? 'custom',
    title: overrides.title ?? 'งานทดสอบ',
    description: null,
    priority: overrides.priority ?? 'normal',
    status: overrides.status ?? 'pending',
    module: overrides.module ?? 'custom',
    due_at: null,
    scheduled_date: '2026-08-29',
    assignee_profile_id: null,
    source_kind: overrides.source_kind ?? 'manual',
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

describe('compareSecretaryTaskOrder ai_suggested', () => {
  test('ranks ai suggestions first among pending actionable tasks', () => {
    const scheduleUrgent = task({
      id: 'schedule',
      module: 'schedule',
      task_type: 'schedule_understaffed',
      priority: 'urgent',
      source_kind: 'derived',
    });
    const aiUrgent = task({
      id: 'ai-urgent',
      source_kind: 'ai_suggested',
      priority: 'urgent',
      title: 'ประสานคลังก่อนออกสาขา 2',
    });
    const aiNormal = task({
      id: 'ai-normal',
      source_kind: 'ai_suggested',
      priority: 'normal',
      title: 'ตรวจรายการก่อนปิดร้าน',
    });
    const inventory = task({
      id: 'inventory',
      module: 'inventory',
      task_type: 'inventory_reorder',
      source_kind: 'derived',
    });

    expect(compareSecretaryTaskOrder(aiUrgent, scheduleUrgent)).toBeLessThan(0);
    expect(compareSecretaryTaskOrder(aiNormal, scheduleUrgent)).toBeLessThan(0);
    expect(compareSecretaryTaskOrder(aiNormal, inventory)).toBeLessThan(0);
  });
});
