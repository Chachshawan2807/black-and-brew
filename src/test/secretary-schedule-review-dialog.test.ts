import { describe, expect, test } from 'vitest';
import { buildScheduleReviewListItems } from '@/lib/secretary/build-schedule-review-list-items';
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

describe('buildScheduleReviewListItems', () => {
  test('maps single schedule task days into list rows', () => {
    expect(
      buildScheduleReviewListItems({
        id: 'under',
        description: 'พ. ที่ 2 (4 คน), อา. ที่ 6 (4 คน)',
      }),
    ).toEqual([
      { id: 'under-day-0', primary: 'พ. ที่ 2', secondary: '4 คน' },
      { id: 'under-day-1', primary: 'อา. ที่ 6', secondary: '4 คน' },
    ]);
  });

  test('maps consolidated schedule sections into grouped summaries', () => {
    expect(
      buildScheduleReviewListItems({
        id: 'session',
        description: null,
        consolidatedSections: [
          { title: 'วันที่คนน้อย', description: 'พ. ที่ 2 (4 คน)' },
          { title: 'ลาหลายคน', description: 'ศ. ที่ 24 (เอ, บี)' },
        ],
      }),
    ).toEqual([
      {
        id: 'section-0',
        primary: 'วันที่คนน้อย',
        secondary: 'พ. ที่ 2 · 4 คน',
      },
      {
        id: 'section-1',
        primary: 'ลาหลายคน',
        secondary: 'ศ. ที่ 24 · เอ, บี',
      },
    ]);
  });
});

describe('resolveSecretaryTaskOverlayKind schedule review', () => {
  test('maps schedule tasks to read-only day detail list', () => {
    expect(
      resolveSecretaryTaskOverlayKind(
        task({ task_type: 'schedule_understaffed', module: 'schedule' }),
      ),
    ).toBe('schedule_review_list');
    expect(
      resolveSecretaryTaskOverlayKind(
        task({ task_type: 'schedule_leave_risk', module: 'schedule' }),
      ),
    ).toBe('schedule_review_list');
  });
});
