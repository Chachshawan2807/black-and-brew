import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import { createBatchAccumulator } from '@/lib/inventory-notification-batching';

function makeRow(id: string, actor: string): DataChangeLogRow {
  return {
    id,
    occurred_at: new Date().toISOString(),
    actor_id: null,
    actor_label: actor,
    actor_access_level: 'full',
    action: 'UPDATE',
    module: 'inventory',
    entity_type: 'inventory_item',
    entity_id: id,
    entity_label: `Item ${id}`,
    field_changes: [],
    old_value: null,
    new_value: null,
    source: 'web',
    ip_address: null,
    user_agent: null,
    status: 'success',
    error_message: null,
    metadata: {},
  };
}

describe('createBatchAccumulator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('flushes batch after window expires', () => {
    const flushed: DataChangeLogRow[][] = [];
    const acc = createBatchAccumulator((rows) => flushed.push(rows), 2000);

    acc.add(makeRow('1', 'Alice'));
    acc.add(makeRow('2', 'Alice'));

    expect(flushed).toHaveLength(0);

    vi.advanceTimersByTime(2000);

    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toHaveLength(2);
  });

  test('defers first flush for bulk rows so siblings batch together', () => {
    const flushed: DataChangeLogRow[][] = [];
    const acc = createBatchAccumulator((rows) => flushed.push(rows), 2000);

    acc.add({ ...makeRow('1', 'Alice'), metadata: { bulk: true } });
    acc.add(makeRow('2', 'Alice'));

    vi.advanceTimersByTime(0);
    expect(flushed).toHaveLength(0);

    vi.advanceTimersByTime(2000);
    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toHaveLength(2);
  });
  test('keeps separate batches per actor', () => {
    const flushed: DataChangeLogRow[][] = [];
    const acc = createBatchAccumulator((rows) => flushed.push(rows), 2000);

    acc.add(makeRow('1', 'Alice'));
    acc.add(makeRow('2', 'Bob'));

    vi.advanceTimersByTime(2000);

    expect(flushed).toHaveLength(2);
    expect(flushed[0]).toHaveLength(1);
    expect(flushed[1]).toHaveLength(1);
  });
});
