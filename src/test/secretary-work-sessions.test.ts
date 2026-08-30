import { describe, expect, test } from 'vitest';
import type { SecretaryTask } from '@/lib/secretary/types';
import {
  formatGuidanceStep,
  formatGuidanceStepsSequence,
  groupTasksIntoGuidanceSteps,
} from '@/lib/secretary/task-work-sessions';

function task(overrides: Partial<SecretaryTask> = {}): SecretaryTask {
  return {
    id: overrides.id ?? 'task-1',
    task_type: overrides.task_type ?? 'custom',
    title: overrides.title ?? 'งานทดสอบ',
    description: null,
    priority: overrides.priority ?? 'urgent',
    status: overrides.status ?? 'pending',
    module: overrides.module ?? 'schedule',
    due_at: null,
    scheduled_date: '2026-08-29',
    assignee_profile_id: null,
    source_kind: 'derived',
    source_ref: null,
    source_ref_hash: null,
    action_href: '/th/schedule',
    metadata: null,
    completed_at: null,
    completed_by: null,
    snoozed_until: null,
    active_session_started_at: null,
    created_at: overrides.created_at ?? '2026-08-29T00:00:00.000Z',
    updated_at: '2026-08-29T00:00:00.000Z',
    ...overrides,
  };
}

describe('task work sessions', () => {
  test('groups consecutive schedule tasks into one guidance step', () => {
    const steps = groupTasksIntoGuidanceSteps([
      task({
        id: 'under',
        task_type: 'schedule_understaffed',
        title: 'ตรวจตาราง วันที่คนน้อย',
      }),
      task({
        id: 'leave',
        task_type: 'schedule_leave_risk',
        title: 'ตรวจตาราง ลาหลายคน',
        created_at: '2026-08-29T01:00:00.000Z',
      }),
    ]);

    expect(steps).toHaveLength(1);
    expect(steps[0]?.kind).toBe('session');
    expect(formatGuidanceStep(steps[0]!)).toBe(
      '"ตรวจตารางงาน" (วันที่คนน้อย และ ลาหลายคน)',
    );
  });

  test('keeps single schedule task as a normal quoted title', () => {
    const steps = groupTasksIntoGuidanceSteps([
      task({
        task_type: 'schedule_understaffed',
        title: 'ตรวจตาราง วันที่คนน้อย',
      }),
    ]);

    expect(steps).toHaveLength(1);
    expect(steps[0]?.kind).toBe('single');
    expect(formatGuidanceStep(steps[0]!)).toBe('"ตรวจตาราง วันที่คนน้อย"');
  });

  test('chains grouped schedule step before unrelated tasks', () => {
    const sequence = formatGuidanceStepsSequence(
      groupTasksIntoGuidanceSteps([
        task({
          id: 'under',
          task_type: 'schedule_understaffed',
          title: 'ตรวจตาราง วันที่คนน้อย',
        }),
        task({
          id: 'leave',
          task_type: 'schedule_leave_risk',
          title: 'ตรวจตาราง ลาหลายคน',
        }),
        task({
          id: 'buy',
          task_type: 'inventory_reorder',
          module: 'inventory',
          title: 'สั่งซื้อสินค้า (9 รายการ)',
        }),
      ]),
    );

    expect(sequence).toBe(
      '"ตรวจตารางงาน" (วันที่คนน้อย และ ลาหลายคน) แล้วต่อด้วย "สั่งซื้อสินค้า (9 รายการ)"',
    );
  });

  test('does not group non-adjacent schedule tasks', () => {
    const steps = groupTasksIntoGuidanceSteps([
      task({
        id: 'under',
        task_type: 'schedule_understaffed',
        title: 'ตรวจตาราง วันที่คนน้อย',
      }),
      task({
        id: 'buy',
        task_type: 'inventory_reorder',
        module: 'inventory',
        title: 'สั่งซื้อสินค้า (9 รายการ)',
      }),
      task({
        id: 'leave',
        task_type: 'schedule_leave_risk',
        title: 'ตรวจตาราง ลาหลายคน',
      }),
    ]);

    expect(steps).toHaveLength(3);
    expect(steps[0]?.kind).toBe('single');
    expect(steps[2]?.kind).toBe('single');
  });
});
