import { describe, expect, test } from 'vitest';
import { buildSecretaryDigestSummary } from '@/lib/secretary/alerts/secretary-notification';
import { resolveCronSecretaryRecordAction } from '@/lib/secretary/alerts/secretary-notification-log';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

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

function task(overrides: Partial<SecretaryTask> = {}): SecretaryTask {
  return {
    id: 'task-1',
    task_type: 'custom',
    title: 'งานทดสอบ',
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
    ...overrides,
  };
}

describe('secretary digest notification', () => {
  test('uses guidance text as summary when provided', () => {
    const digest = buildSecretaryDigestSummary(
      [task(), task({ id: 'task-2', title: 'งานสอง' })],
      snapshot,
      'แนะนำเริ่มจาก "งานทดสอบ" ก่อน แล้วต่อด้วย "งานสอง"',
    );
    expect(digest.summary).toBe('แนะนำเริ่มจาก "งานทดสอบ" ก่อน แล้วต่อด้วย "งานสอง"');
  });

  test('uses guidance text even when no pending tasks remain', () => {
    const digest = buildSecretaryDigestSummary(
      [task({ status: 'done' })],
      snapshot,
      'วันนี้ไม่มีงานค้าง — พร้อมรับงานใหม่เมื่อมี',
    );
    expect(digest.summary).toBe('วันนี้ไม่มีงานค้าง — พร้อมรับงานใหม่เมื่อมี');
  });
});

describe('resolveCronSecretaryRecordAction', () => {
  test('skips when morning push already dispatched today', () => {
    expect(
      resolveCronSecretaryRecordAction(true, '2026-08-29', '2026-08-29', false),
    ).toBe('skip');
  });

  test('inserts when no log exists', () => {
    expect(resolveCronSecretaryRecordAction(false, undefined, '2026-08-29', false)).toBe('insert');
  });

  test('force replaces existing log', () => {
    expect(resolveCronSecretaryRecordAction(true, '2026-08-29', '2026-08-29', true)).toBe('replace');
  });
});
