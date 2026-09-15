import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  readCachedSecretaryBoard,
  writeCachedSecretaryBoard,
} from '@/lib/secretary/home-board-cache';
import { buildMinimalSecretaryBoardSnapshot } from '@/lib/secretary/minimal-board-snapshot';
import { todayIsoBkk } from '@/lib/secretary/today-iso-bkk';
import type { SecretaryTask } from '@/lib/secretary/types';

function sampleTask(id: string): SecretaryTask {
  return {
    id,
    task_type: 'custom',
    title: 'ตรวจสต็อกนม',
    description: null,
    priority: 'normal',
    status: 'pending',
    module: 'custom',
    due_at: null,
    scheduled_date: todayIsoBkk(),
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
    created_at: '2026-09-16T00:00:00.000Z',
    updated_at: '2026-09-16T00:00:00.000Z',
  };
}

describe('home board session cache', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  test('round-trips tasks for the current work date and locale', () => {
    const dateIso = todayIsoBkk();
    const board = {
      snapshot: buildMinimalSecretaryBoardSnapshot(dateIso, 'th'),
      tasks: [sampleTask('task-1')],
    };

    writeCachedSecretaryBoard(board);
    const cached = readCachedSecretaryBoard('th');

    expect(cached?.tasks).toEqual(board.tasks);
    expect(cached?.snapshot.dateIso).toBe(dateIso);
  });

  test('ignores cache from another locale or stale date', () => {
    writeCachedSecretaryBoard({
      snapshot: buildMinimalSecretaryBoardSnapshot(todayIsoBkk(), 'th'),
      tasks: [sampleTask('task-1')],
    });

    expect(readCachedSecretaryBoard('en')).toBeNull();

    vi.spyOn(Storage.prototype, 'getItem').mockReturnValueOnce(
      JSON.stringify({
        locale: 'th',
        dateIso: '2000-01-01',
        tasks: [sampleTask('old')],
      }),
    );

    expect(readCachedSecretaryBoard('th')).toBeNull();
  });
});
