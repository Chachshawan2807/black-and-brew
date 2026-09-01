import { describe, expect, test } from 'vitest';
import { buildSecretaryGuidanceFingerprint } from '@/lib/secretary/guidance-fingerprint';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

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

const snapshot: SecretarySnapshot = {
  dateIso: '2026-08-29',
  locale: 'th',
  operational: {} as SecretarySnapshot['operational'],
  itemsToOrder: [],
  branchWithdrawItems: [],
  inventoryCatalogItems: [],
  maintenanceTasks: [],
  isBranch2Day: false,
  headcountToday: 4,
};

describe('buildSecretaryGuidanceFingerprint', () => {
  test('is stable for the same actionable task set', () => {
    const tasks = [task(), task({ id: 'task-2', title: 'งานสอง', priority: 'urgent' })];
    const a = buildSecretaryGuidanceFingerprint(tasks, snapshot);
    const b = buildSecretaryGuidanceFingerprint(tasks, snapshot);
    expect(a).toBe(b);
  });

  test('changes when task status changes', () => {
    const before = buildSecretaryGuidanceFingerprint([task()], snapshot);
    const after = buildSecretaryGuidanceFingerprint(
      [task({ status: 'in_progress', active_session_started_at: '2026-08-29T01:00:00.000Z' })],
      snapshot,
    );
    expect(before).not.toBe(after);
  });

  test('ignores completed tasks', () => {
    const pendingOnly = buildSecretaryGuidanceFingerprint([task()], snapshot);
    const withDone = buildSecretaryGuidanceFingerprint(
      [task(), task({ id: 'done-1', status: 'done', title: 'เสร็จแล้ว' })],
      snapshot,
    );
    expect(pendingOnly).toBe(withDone);
  });

  test('changes when branch2 day flag changes', () => {
    const regular = buildSecretaryGuidanceFingerprint([task()], snapshot);
    const branch2 = buildSecretaryGuidanceFingerprint([task()], { ...snapshot, isBranch2Day: true });
    expect(regular).not.toBe(branch2);
  });
});
