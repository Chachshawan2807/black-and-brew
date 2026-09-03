import { describe, expect, test } from 'vitest';
import { resolveSecretaryTaskDetailText } from '@/lib/secretary/resolve-task-detail-text';
import type { SecretaryTask } from '@/lib/secretary/types';

function task(overrides: Partial<SecretaryTask> = {}): SecretaryTask {
  return {
    id: 'task-1',
    task_type: 'custom',
    title: 'ตรวจสอบความถูกต้องของสต็อกสินค้า',
    description: null,
    priority: 'normal',
    status: 'pending',
    module: 'inventory_accuracy',
    due_at: null,
    scheduled_date: '2026-08-29',
    assignee_profile_id: null,
    source_kind: 'derived',
    source_ref: null,
    source_ref_hash: null,
    action_href: null,
    metadata: {
      rationale: 'ควรวิเคราะห์หาสาเหตุหลักของความคลาดเคลื่อนของสต็อก เพื่อป้องกันซ้ำ',
    },
    completed_at: null,
    completed_by: null,
    snoozed_until: null,
    active_session_started_at: null,
    created_at: '2026-08-29T00:00:00.000Z',
    updated_at: '2026-08-29T00:00:00.000Z',
    ...overrides,
  };
}

describe('resolveSecretaryTaskDetailText', () => {
  test('uses description when present', () => {
    expect(
      resolveSecretaryTaskDetailText(
        task({ description: 'รายละเอียดจาก description' }),
      ),
    ).toBe('รายละเอียดจาก description');
  });

  test('returns null when description is empty', () => {
    expect(resolveSecretaryTaskDetailText(task())).toBeNull();
  });
});
