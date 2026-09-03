import { describe, expect, test } from 'vitest';
import {
  BEAN_ORDER_NOTIFICATION_ENTITY_TYPES,
  DEFAULT_DATA_CHANGE_LOG_RETENTION_DAYS,
  isDedupProtectedDataChangeLog,
  resolveRetentionCutoffIso,
} from '@/lib/data-change-log-retention';

const NOW = new Date('2026-09-03T12:00:00.000Z');

function daysAgo(days: number): string {
  const date = new Date(NOW);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

describe('data-change-log-retention', () => {
  test('default retention is 90 days', () => {
    expect(DEFAULT_DATA_CHANGE_LOG_RETENTION_DAYS).toBe(90);
  });

  test('resolveRetentionCutoffIso subtracts retention days from anchor', () => {
    expect(resolveRetentionCutoffIso(90, NOW)).toBe('2026-06-05T12:00:00.000Z');
  });

  test('protects recent insights notification dedup rows', () => {
    expect(
      isDedupProtectedDataChangeLog(
        { module: 'insights', entity_type: 'cross_module_insight', occurred_at: daysAgo(2) },
        NOW,
      ),
    ).toBe(true);
    expect(
      isDedupProtectedDataChangeLog(
        { module: 'insights', entity_type: 'cross_module_insight', occurred_at: daysAgo(10) },
        NOW,
      ),
    ).toBe(false);
  });

  test('protects recent schedule daily_report dedup rows', () => {
    expect(
      isDedupProtectedDataChangeLog(
        { module: 'schedule', entity_type: 'daily_report', occurred_at: daysAgo(1) },
        NOW,
      ),
    ).toBe(true);
    expect(
      isDedupProtectedDataChangeLog(
        { module: 'schedule', entity_type: 'shift', occurred_at: daysAgo(1) },
        NOW,
      ),
    ).toBe(false);
  });

  test('protects recent bean_orders notification dedup rows', () => {
    for (const entity_type of BEAN_ORDER_NOTIFICATION_ENTITY_TYPES) {
      expect(
        isDedupProtectedDataChangeLog(
          { module: 'bean_orders', entity_type, occurred_at: daysAgo(10) },
          NOW,
        ),
      ).toBe(true);
    }

    expect(
      isDedupProtectedDataChangeLog(
        { module: 'bean_orders', entity_type: 'bean_order', occurred_at: daysAgo(10) },
        NOW,
      ),
    ).toBe(false);
    expect(
      isDedupProtectedDataChangeLog(
        { module: 'bean_orders', entity_type: 'bean_order_delivery', occurred_at: daysAgo(45) },
        NOW,
      ),
    ).toBe(false);
  });

  test('protects recent security dedup rows', () => {
    expect(
      isDedupProtectedDataChangeLog(
        { module: 'security', entity_type: 'pin_lockout', occurred_at: daysAgo(1) },
        NOW,
      ),
    ).toBe(true);
    expect(
      isDedupProtectedDataChangeLog(
        { module: 'security', entity_type: 'pin_lockout', occurred_at: daysAgo(5) },
        NOW,
      ),
    ).toBe(false);
  });

  test('protects recent secretary digest dedup rows', () => {
    expect(
      isDedupProtectedDataChangeLog(
        { module: 'secretary', entity_type: 'secretary_digest', occurred_at: daysAgo(3) },
        NOW,
      ),
    ).toBe(true);
    expect(
      isDedupProtectedDataChangeLog(
        { module: 'secretary', entity_type: 'secretary_digest', occurred_at: daysAgo(12) },
        NOW,
      ),
    ).toBe(false);
  });

  test('inventory audit rows are never dedup-protected', () => {
    expect(
      isDedupProtectedDataChangeLog(
        { module: 'inventory', entity_type: 'inventory_item', occurred_at: daysAgo(1) },
        NOW,
      ),
    ).toBe(false);
  });
});
