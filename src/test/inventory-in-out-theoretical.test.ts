import { describe, expect, test } from 'vitest';
import {
  computeInOutTheoreticalStock,
  type InOutLedgerRow,
} from '@/lib/inventory-in-out-theoretical';

describe('inventory-in-out-theoretical', () => {
  test('ADD baseline then IN/OUT replay', () => {
    const rows: InOutLedgerRow[] = [
      { type: 'ADD', quantity: 10, created_at: '2026-01-01T00:00:00Z' },
      { type: 'IN', quantity: 5, created_at: '2026-01-02T00:00:00Z' },
      { type: 'OUT', quantity: 3, created_at: '2026-01-03T00:00:00Z' },
    ];
    expect(computeInOutTheoreticalStock(rows)).toBe(12);
  });

  test('latest ADJUST rebaselines stock; only later IN/OUT apply', () => {
    const rows: InOutLedgerRow[] = [
      { type: 'ADD', quantity: 10, created_at: '2026-01-01T00:00:00Z' },
      { type: 'IN', quantity: 5, created_at: '2026-01-02T00:00:00Z' },
      { type: 'ADJUST', quantity: 5, balance_after: 20, created_at: '2026-01-02T12:00:00Z' },
      { type: 'OUT', quantity: 3, created_at: '2026-01-03T00:00:00Z' },
    ];
    expect(computeInOutTheoreticalStock(rows)).toBe(17);
  });

  test('uses the most recent ADJUST as baseline', () => {
    const rows: InOutLedgerRow[] = [
      { type: 'ADD', quantity: 10, created_at: '2026-01-01T00:00:00Z' },
      { type: 'ADJUST', quantity: 2, balance_after: 12, created_at: '2026-01-02T00:00:00Z' },
      { type: 'IN', quantity: 1, created_at: '2026-01-03T00:00:00Z' },
      { type: 'ADJUST', quantity: 3, balance_after: 25, created_at: '2026-01-04T00:00:00Z' },
      { type: 'OUT', quantity: 5, created_at: '2026-01-05T00:00:00Z' },
    ];
    expect(computeInOutTheoreticalStock(rows)).toBe(20);
  });

  test('no ADD uses baseline 0 when there is no ADJUST', () => {
    const rows: InOutLedgerRow[] = [
      { type: 'IN', quantity: 4, created_at: '2026-01-01T00:00:00Z' },
      { type: 'OUT', quantity: 1, created_at: '2026-01-02T00:00:00Z' },
    ];
    expect(computeInOutTheoreticalStock(rows)).toBe(3);
  });

  test('OUT beyond theoretical can go negative when ledger allows', () => {
    const rows: InOutLedgerRow[] = [
      { type: 'ADD', quantity: 2, created_at: '2026-01-01T00:00:00Z' },
      { type: 'OUT', quantity: 5, created_at: '2026-01-02T00:00:00Z' },
    ];
    expect(computeInOutTheoreticalStock(rows)).toBe(-3);
  });

  test('ignores DELETE rows', () => {
    const rows: InOutLedgerRow[] = [
      { type: 'ADD', quantity: 8, created_at: '2026-01-01T00:00:00Z' },
      { type: 'DELETE', quantity: 8, created_at: '2026-01-02T00:00:00Z' },
      { type: 'IN', quantity: 2, created_at: '2026-01-03T00:00:00Z' },
    ];
    expect(computeInOutTheoreticalStock(rows)).toBe(10);
  });
});
