import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  readCachedHomeMemberPanel,
  readCachedSecretaryBoard,
  writeCachedHomeMemberPanel,
  writeCachedSecretaryBoard,
} from '@/lib/secretary/home-board-cache';
import { buildMinimalSecretaryBoardSnapshot } from '@/lib/secretary/minimal-board-snapshot';
import type { HomeMemberPanelSnapshot } from '@/lib/schedule/home-member-panel';
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

function samplePanel(dateIso: string): HomeMemberPanelSnapshot {
  return {
    dateIso,
    profiles: [],
    shifts: [],
    tomorrowDateIso: dateIso,
    tomorrowShifts: [],
  };
}

describe('home board session cache', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
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

  test('survives a new session via localStorage and ignores yesterday', () => {
    const dateIso = todayIsoBkk();
    writeCachedSecretaryBoard({
      snapshot: buildMinimalSecretaryBoardSnapshot(dateIso, 'th'),
      tasks: [sampleTask('task-1')],
    });
    sessionStorage.clear();

    expect(readCachedSecretaryBoard('th')?.tasks[0]?.id).toBe('task-1');
  });

  test('round-trips the same-day member panel', () => {
    const dateIso = todayIsoBkk();
    const panel = samplePanel(dateIso);
    writeCachedHomeMemberPanel(panel);
    sessionStorage.clear();

    expect(readCachedHomeMemberPanel(dateIso)).toEqual(panel);
    expect(readCachedHomeMemberPanel('2000-01-01')).toBeNull();
  });

  test('keeps card detail when a deferred refresh rewrites the task list', () => {
    const dateIso = todayIsoBkk();
    const detailItem = { id: 'milk', name: 'นม' };
    writeCachedSecretaryBoard({
      snapshot: {
        ...buildMinimalSecretaryBoardSnapshot(dateIso, 'th'),
        detailStatus: 'ready',
        itemsToOrder: [detailItem] as never,
        inventoryCatalogItems: [detailItem] as never,
      },
      tasks: [sampleTask('task-1')],
    });

    writeCachedSecretaryBoard({
      snapshot: buildMinimalSecretaryBoardSnapshot(dateIso, 'th'),
      tasks: [sampleTask('task-2')],
    });

    const cached = readCachedSecretaryBoard('th');
    expect(cached?.tasks.map((task) => task.id)).toEqual(['task-2']);
    expect(cached?.snapshot.itemsToOrder).toEqual([detailItem]);
    expect(cached?.snapshot.inventoryCatalogItems).toEqual([detailItem]);
    expect(cached?.snapshot.detailStatus).toBe('ready');
  });

  test('a ready empty snapshot replaces stale card detail', () => {
    const dateIso = todayIsoBkk();
    writeCachedSecretaryBoard({
      snapshot: {
        ...buildMinimalSecretaryBoardSnapshot(dateIso, 'th'),
        detailStatus: 'ready',
        itemsToOrder: [{ id: 'milk', name: 'นม' }] as never,
      },
      tasks: [sampleTask('task-1')],
    });

    writeCachedSecretaryBoard({
      snapshot: {
        ...buildMinimalSecretaryBoardSnapshot(dateIso, 'th'),
        detailStatus: 'ready',
      },
      tasks: [sampleTask('task-2')],
    });

    const cached = readCachedSecretaryBoard('th');
    expect(cached?.snapshot.itemsToOrder).toEqual([]);
    expect(cached?.snapshot.detailStatus).toBe('ready');
  });
});
