import { describe, expect, test } from 'vitest';
import { buildFallbackSecretaryGuidance } from '@/lib/secretary/guidance-fallback';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

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

const snapshot: SecretarySnapshot = {
  dateIso: '2026-08-29',
  locale: 'th',
  operational: {} as SecretarySnapshot['operational'],
  itemsToOrder: [],
  branchWithdrawItems: [],
  maintenanceTasks: [],
  isBranch2Day: false,
  headcountToday: 4,
};

describe('buildFallbackSecretaryGuidance', () => {
  test('returns empty-board message when no actionable tasks', () => {
    expect(buildFallbackSecretaryGuidance([], snapshot)).toContain('ไม่มีงานค้าง');
  });

  test('prioritizes in-progress work', () => {
    const text = buildFallbackSecretaryGuidance(
      [
        task({ id: 'a', title: 'งาน A', status: 'in_progress', active_session_started_at: '2026-08-29T01:00:00.000Z' }),
        task({ id: 'b', title: 'งาน B' }),
      ],
      snapshot,
    );
    expect(text).toContain('งาน A');
  });

  test('mentions urgent task before normal task', () => {
    const text = buildFallbackSecretaryGuidance(
      [
        task({ id: 'normal', title: 'งานปกติ', priority: 'normal' }),
        task({ id: 'urgent', title: 'งานเร่งด่วน', priority: 'urgent' }),
      ],
      snapshot,
    );
    expect(text.indexOf('งานเร่งด่วน')).toBeLessThan(text.indexOf('งานปกติ'));
  });

  test('lists every actionable task in one sentence', () => {
    const text = buildFallbackSecretaryGuidance(
      [
        task({ id: 'a', title: 'เบิกของสาขา 2' }),
        task({ id: 'b', title: 'สั่งซื้อสินค้า (3 รายการ)' }),
        task({ id: 'c', title: 'ซ่อมบำรุงเลยกำหนด (2)' }),
      ],
      snapshot,
    );
    expect(text).toContain('เบิกของสาขา 2');
    expect(text).toContain('สั่งซื้อสินค้า (3 รายการ)');
    expect(text).toContain('ซ่อมบำรุงเลยกำหนด (2)');
    expect(text.split(/[.!?]/).filter(Boolean)).toHaveLength(1);
  });

  test('chains tasks with แล้วต่อด้วย in priority order', () => {
    const text = buildFallbackSecretaryGuidance(
      [
        task({ id: 'a', title: 'งาน A', priority: 'normal', created_at: '2026-08-29T02:00:00.000Z' }),
        task({ id: 'b', title: 'งาน B', priority: 'urgent', created_at: '2026-08-29T01:00:00.000Z' }),
      ],
      snapshot,
    );
    expect(text).toMatch(/งาน B.*แล้วต่อด้วย.*งาน A/);
  });

  test('uses branch2 prefix on branch2 days', () => {
    const text = buildFallbackSecretaryGuidance(
      [task({ id: 'a', title: 'เบิกของสาขา 2' })],
      { ...snapshot, isBranch2Day: true },
    );
    expect(text).toContain('วันไปสาขา 2');
  });

  test('omits completed tasks from the ordered sentence', () => {
    const text = buildFallbackSecretaryGuidance(
      [
        task({ id: 'done', title: 'งานเสร็จแล้ว', status: 'done', completed_at: '2026-08-29T08:00:00.000Z' }),
        task({ id: 'next', title: 'งานถัดไป' }),
      ],
      snapshot,
    );
    expect(text).not.toContain('งานเสร็จแล้ว');
    expect(text).toContain('งานถัดไป');
  });

  test('uses female assistant voice with นะคะ or ค่ะ', () => {
    const withTasks = buildFallbackSecretaryGuidance([task({ id: 'a', title: 'งาน A' })], snapshot);
    const empty = buildFallbackSecretaryGuidance([], snapshot);

    expect(withTasks).toMatch(/(ค่ะ|นะคะ)/);
    expect(empty).toMatch(/(ค่ะ|นะคะ)/);
    expect(withTasks).not.toMatch(/ครับ|ผม/);
    expect(empty).not.toMatch(/ครับ|ผม/);
  });

  test('groups schedule review cards into one guidance step', () => {
    const text = buildFallbackSecretaryGuidance(
      [
        task({
          id: 'under',
          task_type: 'schedule_understaffed',
          module: 'schedule',
          title: 'ตรวจตาราง — วันที่คนน้อย',
          priority: 'urgent',
        }),
        task({
          id: 'leave',
          task_type: 'schedule_leave_risk',
          module: 'schedule',
          title: 'ตรวจตาราง — ลาหลายคน',
          priority: 'urgent',
          created_at: '2026-08-29T01:00:00.000Z',
        }),
        task({
          id: 'buy',
          task_type: 'inventory_reorder',
          module: 'inventory',
          title: 'สั่งซื้อสินค้า (9 รายการ)',
          priority: 'normal',
        }),
      ],
      snapshot,
    );

    expect(text).toContain('"ตรวจตารางงาน" (วันที่คนน้อย และ ลาหลายคน)');
    expect(text).toContain('แล้วต่อด้วย "สั่งซื้อสินค้า (9 รายการ)"');
    expect(text).not.toMatch(/ตรวจตาราง — วันที่คนน้อย.*แล้วต่อด้วย.*ตรวจตาราง — ลาหลายคน/);
  });
});
