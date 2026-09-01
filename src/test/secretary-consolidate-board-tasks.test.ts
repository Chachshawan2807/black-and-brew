import { describe, expect, test } from 'vitest';
import {
  boardTaskConsolidationKey,
  consolidateSecretaryBoardTasks,
} from '@/lib/secretary/consolidate-board-tasks';
import type { SecretaryTask } from '@/lib/secretary/types';

function task(partial: Partial<SecretaryTask> & Pick<SecretaryTask, 'id'>): SecretaryTask {
  return {
    task_type: 'inventory_reorder',
    title: partial.title ?? 'สั่งซื้อสินค้า (2 รายการ)',
    description: null,
    priority: 'normal',
    status: 'pending',
    module: 'inventory',
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
    ...partial,
  };
}

describe('consolidateSecretaryBoardTasks', () => {
  test('merges duplicate task_type into one card', () => {
    const consolidated = consolidateSecretaryBoardTasks([
      task({ id: 'a', task_type: 'inventory_count_due', title: 'ตรวจนับสต็อกวันนี้' }),
      task({
        id: 'b',
        task_type: 'inventory_count_due',
        title: 'ตรวจนับสต็อกวันนี้',
        created_at: '2026-08-29T01:00:00.000Z',
      }),
    ]);

    expect(consolidated).toHaveLength(1);
    expect(consolidated[0]?.consolidatedTaskIds).toEqual(['a', 'b']);
    expect(consolidated[0]?.title).toBe('ตรวจนับสต็อกวันนี้ (2)');
  });

  test('keeps different task types separate', () => {
    const consolidated = consolidateSecretaryBoardTasks([
      task({ id: 'a', task_type: 'inventory_reorder' }),
      task({ id: 'b', task_type: 'branch_withdraw', module: 'branch_withdraw', title: 'เบิกของ' }),
    ]);

    expect(consolidated).toHaveLength(2);
  });

  test('merges related schedule review tasks into one card', () => {
    const consolidated = consolidateSecretaryBoardTasks([
      task({
        id: 'under',
        task_type: 'schedule_understaffed',
        module: 'schedule',
        title: 'ตรวจตาราง วันที่คนน้อย',
        description: 'พ. ที่ 2 (4 คน)',
        priority: 'urgent',
      }),
      task({
        id: 'leave',
        task_type: 'schedule_leave_risk',
        module: 'schedule',
        title: 'ตรวจตาราง ลาหลายคน',
        description: 'ศ. ที่ 24 (เอ, บี)',
        priority: 'urgent',
        created_at: '2026-08-29T01:00:00.000Z',
      }),
      task({
        id: 'mgmt',
        task_type: 'schedule_mgmt_review',
        module: 'schedule',
        title: 'ทบทวนตารางงานและการจัดคน',
        description: 'มีวันที่คนน้อย · มีความเสี่ยงลาหลายคน',
        priority: 'urgent',
        created_at: '2026-08-29T02:00:00.000Z',
      }),
    ]);

    expect(consolidated).toHaveLength(1);
    expect(consolidated[0]?.title).toBe('ตรวจตารางงาน');
    expect(consolidated[0]?.consolidatedTaskIds).toEqual(['under', 'leave', 'mgmt']);
    expect(consolidated[0]?.consolidatedSections).toHaveLength(3);
  });

  test('merges custom tasks with same normalized title and module', () => {
    expect(boardTaskConsolidationKey(task({ id: 'a', task_type: 'custom', module: 'custom', title: 'เช็คคลัง' }))).toBe(
      boardTaskConsolidationKey(task({ id: 'b', task_type: 'custom', module: 'custom', title: ' เช็คคลัง ' })),
    );
  });
});
