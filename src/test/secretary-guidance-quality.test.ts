import { describe, expect, test } from 'vitest';
import {
  guidanceCoversAllTasks,
  isUsableGuidanceText,
  normalizeGuidanceText,
  resolveGuidanceText,
} from '@/lib/secretary/guidance-quality';
import type { SecretaryTask } from '@/lib/secretary/types';

function task(title: string): SecretaryTask {
  return {
    id: title,
    task_type: 'custom',
    title,
    description: null,
    priority: 'normal',
    status: 'pending',
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
    active_session_started_at: null,
    created_at: '2026-08-29T00:00:00.000Z',
    updated_at: '2026-08-29T00:00:00.000Z',
  };
}

describe('secretary guidance quality', () => {
  test('rejects truncated AI fragments', () => {
    expect(isUsableGuidanceText('ให้ทำซ่อมบ', 3)).toBe(false);
  });

  test('accepts complete guidance sentences', () => {
    expect(
      isUsableGuidanceText(
        'แนะนำทำตามลำดับนี้นะคะ: "ซ่อมบำรุงเลยกำหนด (4)" แล้วต่อด้วย "สั่งซื้อสินค้า (9 รายการ)"',
        3,
      ),
    ).toBe(true);
  });

  test('resolveGuidanceText falls back when AI output is too short', () => {
    const fallback =
      'แนะนำทำตามลำดับนี้นะคะ: "ซ่อมบำรุงเลยกำหนด (4)" แล้วต่อด้วย "สั่งซื้อสินค้า (9 รายการ)"';
    expect(resolveGuidanceText('ให้ทำซ่อมบ', fallback, 3)).toBe(fallback);
  });

  test('rejects AI guidance that omits actionable tasks', () => {
    const fallback =
      'แนะนำทำตามลำดับนี้นะคะ: "งาน A" แล้วต่อด้วย "งาน B" แล้วต่อด้วย "งาน C"';
    const partial = 'แนะนำทำตามลำดับ: "งาน A" แล้วต่อด้วย "งาน B"';
    const actionable = [task('งาน A'), task('งาน B'), task('งาน C')];
    expect(guidanceCoversAllTasks(partial, actionable)).toBe(false);
    expect(resolveGuidanceText(partial, fallback, 3, actionable)).toBe(fallback);
  });

  test('normalizeGuidanceText collapses whitespace', () => {
    expect(normalizeGuidanceText('  แนะนำ   เริ่ม  ')).toBe('แนะนำ เริ่ม');
  });
});
