import { describe, expect, test } from 'vitest';
import { buildTaskInfoListItems } from '@/lib/secretary/build-task-info-list-items';
import type { SecretaryTask } from '@/lib/secretary/types';

function task(overrides: Partial<SecretaryTask> = {}): SecretaryTask {
  return {
    id: 'task-1',
    task_type: 'inventory_count_due',
    title: 'นับสต็อก',
    description: null,
    priority: 'normal',
    status: 'pending',
    module: 'inventory_count',
    due_at: null,
    scheduled_date: '2026-08-29',
    assignee_profile_id: null,
    source_kind: 'derived',
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

describe('buildTaskInfoListItems', () => {
  test('splits multiline descriptions into table rows', () => {
    const items = buildTaskInfoListItems(
      task({
        description: 'คงเหลือ 3 รายการ\nยังไม่นับวันนี้ 2 รายการ',
      }),
    );
    expect(items).toEqual([
      { id: 'task-1-info-0', primary: 'คงเหลือ 3 รายการ' },
      { id: 'task-1-info-1', primary: 'ยังไม่นับวันนี้ 2 รายการ' },
    ]);
  });

  test('parses label: value segments from bullet-separated copy', () => {
    const items = buildTaskInfoListItems(
      task({
        description: 'คนน้อย: ส. ที่ 25 (4 คน) · ออเดอร์ค้าง: 2 รายการ',
      }),
    );
    expect(items).toEqual([
      { id: 'task-1-info-0', primary: 'คนน้อย', secondary: 'ส. ที่ 25 (4 คน)' },
      { id: 'task-1-info-1', primary: 'ออเดอร์ค้าง', secondary: '2 รายการ' },
    ]);
  });
});
