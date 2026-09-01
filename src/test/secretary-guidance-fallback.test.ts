import { describe, expect, test } from 'vitest';
import {
  buildFallbackSecretaryGuidance,
  buildSummaryGuidance,
} from '@/lib/secretary/guidance-fallback';
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

describe('buildSummaryGuidance', () => {
  test('returns empty-board message when no actionable tasks', () => {
    expect(buildSummaryGuidance([], snapshot)).toContain('ไม่มีงานค้าง');
  });

  test('single task mentions title only', () => {
    const text = buildSummaryGuidance([task({ id: 'a', title: 'งาน A' })], snapshot);
    expect(text).toContain('งาน A');
    expect(text).not.toContain('แล้วต่อด้วย');
    expect(text.length).toBeLessThan(120);
  });

  test('prioritizes in-progress work as top title', () => {
    const text = buildSummaryGuidance(
      [
        task({ id: 'a', title: 'งาน A', status: 'in_progress', active_session_started_at: '2026-08-29T01:00:00.000Z' }),
        task({ id: 'b', title: 'งาน B' }),
      ],
      snapshot,
    );
    expect(text).toContain('งาน A');
    expect(text).not.toContain('แล้วต่อด้วย');
  });

  test('mentions urgent count for multiple tasks', () => {
    const text = buildSummaryGuidance(
      [
        task({ id: 'urgent', title: 'งานเร่งด่วน', priority: 'urgent' }),
        task({ id: 'normal', title: 'งานปกติ', priority: 'normal' }),
      ],
      snapshot,
    );
    expect(text).toContain('2 งาน');
    expect(text).toContain('งานเร่งด่วน');
    expect(text).toContain('เร่งด่วน');
    expect(text).not.toContain('แล้วต่อด้วย');
  });

  test('does not list every task title when many tasks', () => {
    const text = buildSummaryGuidance(
      [
        task({ id: 'a', title: 'เบิกของสาขา 2' }),
        task({ id: 'b', title: 'สั่งซื้อสินค้า (3 รายการ)' }),
        task({ id: 'c', title: 'ซ่อมบำรุงเลยกำหนด (2)' }),
      ],
      snapshot,
    );
    expect(text).toContain('3 งาน');
    expect(text).toContain('เบิกของสาขา 2');
    expect(text).not.toContain('สั่งซื้อสินค้า');
    expect(text).not.toContain('ซ่อมบำรุงเลยกำหนด');
    expect(text.length).toBeLessThan(200);
  });

  test('uses branch2 prefix on branch2 days', () => {
    const text = buildSummaryGuidance(
      [task({ id: 'a', title: 'เบิกของสาขา 2' })],
      { ...snapshot, isBranch2Day: true },
    );
    expect(text).toContain('วันไปสาขา 2');
  });

  test('omits completed tasks', () => {
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
    const withTasks = buildSummaryGuidance([task({ id: 'a', title: 'งาน A' })], snapshot);
    const empty = buildSummaryGuidance([], snapshot);

    expect(withTasks).toMatch(/(ค่ะ|นะคะ)/);
    expect(empty).toMatch(/(ค่ะ|นะคะ)/);
    expect(withTasks).not.toMatch(/ครับ|ผม/);
    expect(empty).not.toMatch(/ครับ|ผม/);
  });
});

describe('buildFallbackSecretaryGuidance', () => {
  test('delegates to summary guidance', () => {
    const text = buildFallbackSecretaryGuidance(
      [task({ id: 'a', title: 'งาน A' }), task({ id: 'b', title: 'งาน B' })],
      snapshot,
    );
    expect(text).toContain('2 งาน');
    expect(text).not.toContain('แล้วต่อด้วย');
  });
});
