import { describe, expect, test } from 'vitest';
import {
  resolveDerivedTaskScheduledDate,
  resolveDerivedTaskUpsert,
} from '@/lib/secretary/derive-tasks';
import type { DerivedTaskDraft } from '@/lib/secretary/types';

function draft(overrides: Partial<DerivedTaskDraft> = {}): DerivedTaskDraft {
  return {
    taskType: 'inventory_reorder',
    title: 'สั่งซื้อสินค้า (3 รายการ)',
    description: 'item a',
    priority: 'normal',
    module: 'inventory',
    sourceRef: { rule: 'inventory_reorder', itemIds: ['1'] },
    sourceRefHash: 'hash-inventory',
    actionHref: '/th/inventory',
    estimatedMinutes: 45,
    ...overrides,
  };
}

describe('resolveDerivedTaskScheduledDate', () => {
  test('rolls past dates forward to today', () => {
    expect(resolveDerivedTaskScheduledDate('2026-08-28', '2026-08-29')).toBe('2026-08-29');
  });

  test('keeps future deferred dates', () => {
    expect(resolveDerivedTaskScheduledDate('2026-08-30', '2026-08-29')).toBe('2026-08-30');
  });
});

describe('resolveDerivedTaskUpsert', () => {
  test('inserts when no existing row', () => {
    const decision = resolveDerivedTaskUpsert(draft(), '2026-08-29', null);
    expect(decision.action).toBe('insert');
    if (decision.action === 'insert') {
      expect(decision.row.scheduled_date).toBe('2026-08-29');
    }
  });

  test('rolls pending task from yesterday onto today', () => {
    const decision = resolveDerivedTaskUpsert(draft(), '2026-08-29', {
      id: 'task-1',
      status: 'pending',
      scheduled_date: '2026-08-28',
    });
    expect(decision.action).toBe('update');
    if (decision.action === 'update') {
      expect(decision.patch.scheduled_date).toBe('2026-08-29');
    }
  });

  test('does not pull deferred future task back to today', () => {
    const decision = resolveDerivedTaskUpsert(draft(), '2026-08-29', {
      id: 'task-1',
      status: 'pending',
      scheduled_date: '2026-08-30',
    });
    expect(decision.action).toBe('update');
    if (decision.action === 'update') {
      expect(decision.patch.scheduled_date).toBe('2026-08-30');
    }
  });

  test('reopens done task from a previous day when condition persists', () => {
    const decision = resolveDerivedTaskUpsert(draft(), '2026-08-29', {
      id: 'task-1',
      status: 'done',
      scheduled_date: '2026-08-28',
    });
    expect(decision.action).toBe('update');
    if (decision.action === 'update') {
      expect(decision.patch.status).toBe('pending');
      expect(decision.patch.scheduled_date).toBe('2026-08-29');
      expect(decision.patch.completed_at).toBeNull();
    }
  });

  test('skips manually completed task already on today', () => {
    const decision = resolveDerivedTaskUpsert(draft(), '2026-08-29', {
      id: 'task-1',
      status: 'done',
      scheduled_date: '2026-08-29',
    });
    expect(decision.action).toBe('skip');
  });

  test('reopens auto-skipped task on the same day when condition persists', () => {
    const decision = resolveDerivedTaskUpsert(draft(), '2026-08-29', {
      id: 'task-1',
      status: 'skipped',
      scheduled_date: '2026-08-29',
      metadata: { autoSkipped: true },
    });
    expect(decision.action).toBe('update');
    if (decision.action === 'update') {
      expect(decision.patch.status).toBe('pending');
      expect(decision.patch.completed_at).toBeNull();
    }
  });

  test('reopens auto-completed task on the same day when condition persists', () => {
    const decision = resolveDerivedTaskUpsert(draft(), '2026-08-29', {
      id: 'task-1',
      status: 'done',
      scheduled_date: '2026-08-29',
      metadata: { autoCompleted: true },
    });
    expect(decision.action).toBe('update');
    if (decision.action === 'update') {
      expect(decision.patch.status).toBe('pending');
      expect(decision.patch.completed_at).toBeNull();
    }
  });
});
