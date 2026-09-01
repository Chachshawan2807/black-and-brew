import { describe, expect, test } from 'vitest';
import {
  DEFAULT_MAX_LENGTH,
  isUsableSummaryGuidance,
  normalizeGuidanceText,
  resolveGuidanceText,
} from '@/lib/secretary/guidance-quality';
import type { SecretaryTask } from '@/lib/secretary/types';

function task(title: string, overrides: Partial<SecretaryTask> = {}): SecretaryTask {
  return {
    id: title,
    task_type: 'custom',
    title,
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

describe('secretary guidance quality', () => {
  test('rejects truncated AI fragments', () => {
    expect(isUsableSummaryGuidance('ให้ทำซ่อมบ', [task('งาน A'), task('งาน B'), task('งาน C')])).toBe(
      false,
    );
  });

  test('accepts short summary guidance', () => {
    expect(
      isUsableSummaryGuidance(
        'วันนี้มี 3 งานค้าง เริ่มจากซ่อมบำรุงเลยกำหนดก่อน มีเร่งด่วน 1 รายการนะคะ',
        [task('ซ่อมบำรุงเลยกำหนด (4)'), task('สั่งซื้อสินค้า (9 รายการ)'), task('งาน C')],
      ),
    ).toBe(true);
  });

  test('resolveGuidanceText falls back when AI output is too short', () => {
    const fallback =
      'วันนี้มี 3 งานค้าง เริ่มจาก "ซ่อมบำรุงเลยกำหนด (4)" ก่อน ดูลำดับเต็มได้ที่การ์ดด้านล่างนะคะ';
    const actionable = [
      task('ซ่อมบำรุงเลยกำหนด (4)'),
      task('สั่งซื้อสินค้า (9 รายการ)'),
      task('งาน C'),
    ];
    expect(resolveGuidanceText('ให้ทำซ่อมบ', fallback, actionable)).toBe(fallback);
  });

  test('rejects AI guidance that lists every task in a long chain', () => {
    const fallback = 'วันนี้มี 3 งานค้าง เริ่มจาก "งาน A" ก่อน ดูลำดับเต็มได้ที่การ์ดด้านล่างนะคะ';
    const actionable = [task('งาน A'), task('งาน B'), task('งาน C')];
    const longChain =
      'แนะนำทำตามลำดับนี้นะคะ: "งาน A" แล้วต่อด้วย "งาน B" แล้วต่อด้วย "งาน C"';
    expect(isUsableSummaryGuidance(longChain, actionable)).toBe(false);
    expect(resolveGuidanceText(longChain, fallback, actionable)).toBe(fallback);
  });

  test('normalizeGuidanceText collapses whitespace and caps length', () => {
    expect(normalizeGuidanceText('  แนะนำ   เริ่ม  ')).toBe('แนะนำ เริ่ม');
    expect(normalizeGuidanceText('x'.repeat(400)).length).toBe(DEFAULT_MAX_LENGTH);
  });

  test('requires in-progress task to be mentioned', () => {
    const actionable = [
      task('งาน A', { status: 'in_progress', active_session_started_at: '2026-08-29T01:00:00.000Z' }),
      task('งาน B'),
    ];
    expect(
      isUsableSummaryGuidance('วันนี้มี 2 งานค้าง เริ่มจากงานอื่นก่อนนะคะ', actionable),
    ).toBe(false);
    expect(
      isUsableSummaryGuidance('ทำต่อจากงาน A ที่ค้างอยู่ก่อน แล้วค่อยดูงานถัดไปนะคะ', actionable),
    ).toBe(true);
  });
});
