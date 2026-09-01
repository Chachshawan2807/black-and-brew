import { describe, expect, test } from 'vitest';
import {
  buildAiAcceptanceMetadata,
  shouldRecordAiAcceptance,
} from '@/lib/secretary/ai-acceptance';
import type { SecretaryTask } from '@/lib/secretary/types';

function task(overrides: Partial<SecretaryTask> = {}): SecretaryTask {
  return {
    id: 'ai-1',
    task_type: 'custom',
    title: 'งาน AI แนะนำ',
    description: null,
    priority: 'normal',
    status: 'pending',
    module: 'custom',
    due_at: null,
    scheduled_date: '2026-08-29',
    assignee_profile_id: null,
    source_kind: 'ai_suggested',
    source_ref: null,
    source_ref_hash: null,
    action_href: null,
    metadata: { aiAcceptedCount: 1, aiRejectedCount: 0 },
    completed_at: null,
    completed_by: null,
    snoozed_until: null,
    active_session_started_at: null,
    created_at: '2026-08-29T00:00:00.000Z',
    updated_at: '2026-08-29T00:00:00.000Z',
    ...overrides,
  };
}

describe('secretary ai acceptance', () => {
  test('records only ai_suggested tasks', () => {
    expect(shouldRecordAiAcceptance(task())).toBe(true);
    expect(shouldRecordAiAcceptance(task({ source_kind: 'derived' }))).toBe(false);
  });

  test('increments accepted and rejected counters', () => {
    const accepted = buildAiAcceptanceMetadata(task(), 'accepted');
    expect(accepted.aiAcceptedCount).toBe(2);
    expect(accepted.aiRejectedCount).toBe(0);
    expect(accepted.aiAcceptance).toBe('accepted');

    const rejected = buildAiAcceptanceMetadata(task(), 'rejected');
    expect(rejected.aiAcceptedCount).toBe(1);
    expect(rejected.aiRejectedCount).toBe(1);
    expect(rejected.aiAcceptance).toBe('rejected');
  });
});
