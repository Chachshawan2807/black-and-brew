import { describe, expect, test } from 'vitest';
import { buildAiSuggestionFingerprint } from '@/lib/secretary/ai-suggestion-fingerprint';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';

function snapshot(overrides: Partial<SecretarySnapshot> = {}): SecretarySnapshot {
  return {
    dateIso: '2026-08-29',
    locale: 'th',
    operational: {} as SecretarySnapshot['operational'],
    itemsToOrder: [],
    branchWithdrawItems: [],
    inventoryCatalogItems: [],
    maintenanceTasks: [],
    isBranch2Day: false,
    headcountToday: 3,
    ...overrides,
  };
}

function task(id: string, overrides: Partial<SecretaryTask> = {}): SecretaryTask {
  return {
    id,
    task_type: 'custom',
    title: `งาน ${id}`,
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

describe('secretary ai suggestion fingerprint', () => {
  test('same snapshot and tasks produce stable fingerprint', () => {
    const snap = snapshot({ isBranch2Day: true, headcountToday: 2 });
    const tasks = [task('a', { module: 'inventory', source_kind: 'derived' })];

    const first = buildAiSuggestionFingerprint(snap, tasks);
    const second = buildAiSuggestionFingerprint(snap, tasks);

    expect(first).toBe(second);
    expect(first).toHaveLength(32);
  });

  test('fingerprint changes when actionable task set changes', () => {
    const snap = snapshot();
    const before = buildAiSuggestionFingerprint(snap, [task('a')]);
    const after = buildAiSuggestionFingerprint(snap, [
      task('a'),
      task('b', { status: 'pending', title: 'งานใหม่' }),
    ]);

    expect(before).not.toBe(after);
  });
});
