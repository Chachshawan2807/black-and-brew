import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import { BATCH_WINDOW_MS } from '@/lib/notification-types';

export interface PendingBatch {
  actorLabel: string;
  rows: DataChangeLogRow[];
  timer: ReturnType<typeof setTimeout> | null;
}

export type BatchFlushHandler = (rows: DataChangeLogRow[]) => void;

export function createBatchAccumulator(flush: BatchFlushHandler, windowMs = BATCH_WINDOW_MS) {
  const pending = new Map<string, PendingBatch>();

  function flushBatch(key: string) {
    const batch = pending.get(key);
    if (!batch || batch.rows.length === 0) return;
    if (batch.timer) clearTimeout(batch.timer);
    pending.delete(key);
    flush(batch.rows);
  }

  function add(row: DataChangeLogRow) {
    const key = row.actor_label;
    const existing = pending.get(key);

    if (existing) {
      existing.rows.push(row);
      if (existing.timer) clearTimeout(existing.timer);
      existing.timer = setTimeout(() => flushBatch(key), windowMs);
      return;
    }

    const batch: PendingBatch = {
      actorLabel: key,
      rows: [row],
      timer: setTimeout(() => flushBatch(key), 0),
    };
    pending.set(key, batch);
  }

  function dispose() {
    for (const key of pending.keys()) {
      flushBatch(key);
    }
  }

  return { add, dispose, flushBatch };
}

export function shouldBatchTogether(a: DataChangeLogRow, b: DataChangeLogRow): boolean {
  return a.actor_label === b.actor_label;
}
