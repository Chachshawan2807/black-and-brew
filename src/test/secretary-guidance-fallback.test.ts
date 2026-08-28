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
});
