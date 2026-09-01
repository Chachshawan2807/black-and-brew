import { describe, expect, test } from 'vitest';
import { hasCrossModuleSignal } from '@/lib/secretary/cross-module-signal';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';
import { EMPTY_SECRETARY_COUNT_SESSION } from '@/lib/secretary/types';

function baseSnapshot(overrides: Partial<SecretarySnapshot> = {}): SecretarySnapshot {
  return {
    dateIso: '2026-08-29',
    locale: 'th',
    operational: {
      dateIso: '2026-08-29',
      dateDisplay: '29-08-2026',
      locale: 'th',
      headcount: 2,
      leaveCount: 0,
      offCount: 0,
      weeklyDays: [],
      pendingBeanOrders: [],
      upcomingHoliday: null,
    },
    itemsToOrder: [],
    branchWithdrawItems: [],
    inventoryCatalogItems: [],
    maintenanceTasks: [],
    isBranch2Day: false,
    headcountToday: 2,
    countSession: { ...EMPTY_SECRETARY_COUNT_SESSION },
    ...overrides,
  };
}

function derivedTask(module: SecretaryTask['module'], priority: SecretaryTask['priority'] = 'normal'): SecretaryTask {
  return {
    id: `${module}-${priority}`,
    task_type: 'custom',
    title: 'งานทดสอบ',
    description: null,
    priority,
    status: 'pending',
    module,
    due_at: null,
    scheduled_date: '2026-08-29',
    assignee_profile_id: null,
    source_kind: 'derived',
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
  };
}

describe('hasCrossModuleSignal', () => {
  test('true when two modules have pending derived tasks', () => {
    const snapshot = baseSnapshot();
    const tasks = [derivedTask('inventory'), derivedTask('schedule')];
    expect(hasCrossModuleSignal(snapshot, tasks)).toBe(true);
  });

  test('true when count session has mismatches', () => {
    const snapshot = baseSnapshot({
      countSession: {
        ...EMPTY_SECRETARY_COUNT_SESSION,
        totalExactCountItems: 10,
        countedTodayCount: 3,
        mismatchCount: 2,
        isFullyCountedToday: false,
      },
    });
    expect(hasCrossModuleSignal(snapshot, [])).toBe(true);
  });

  test('false for single-module snapshot with no cross signals', () => {
    const snapshot = baseSnapshot();
    expect(hasCrossModuleSignal(snapshot, [])).toBe(false);
  });
});
