import { describe, expect, test } from 'vitest';
import { parseScheduleReviewDescription } from '@/lib/secretary/parse-schedule-review-description';
import { resolveSecretaryTaskOverlayKind } from '@/lib/secretary/resolve-task-overlay';
import type { SecretaryTask } from '@/lib/secretary/types';

function task(partial: Partial<SecretaryTask>): SecretaryTask {
  return {
    id: 'task-1',
    task_type: 'custom',
    title: 'งานทดสอบ',
    description: null,
    priority: 'normal',
    status: 'pending',
    module: 'custom',
    due_at: null,
    scheduled_date: '2026-08-28',
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
    created_at: '2026-08-28T00:00:00.000Z',
    updated_at: '2026-08-28T00:00:00.000Z',
    ...partial,
  };
}

describe('parseScheduleReviewDescription', () => {
  test('parses grouped day summaries', () => {
    expect(
      parseScheduleReviewDescription('พ. ที่ 2 (4 คน), อา. ที่ 6 (4 คน)'),
    ).toEqual([
      { dayLabel: 'พ. ที่ 2', detail: '4 คน' },
      { dayLabel: 'อา. ที่ 6', detail: '4 คน' },
    ]);
  });

  test('parses leave coverage summaries', () => {
    expect(parseScheduleReviewDescription('ศ. ที่ 24 (เอ, บี), ส. ที่ 25 (ซี)')).toEqual([
      { dayLabel: 'ศ. ที่ 24', detail: 'เอ, บี' },
      { dayLabel: 'ส. ที่ 25', detail: 'ซี' },
    ]);
  });
});

describe('resolveSecretaryTaskOverlayKind schedule review', () => {
  test('maps schedule tasks to embedded schedule panel', () => {
    expect(
      resolveSecretaryTaskOverlayKind(
        task({ task_type: 'schedule_understaffed', module: 'schedule' }),
      ),
    ).toBe('schedule_panel');
    expect(
      resolveSecretaryTaskOverlayKind(
        task({ task_type: 'schedule_leave_risk', module: 'schedule' }),
      ),
    ).toBe('schedule_panel');
  });
});
