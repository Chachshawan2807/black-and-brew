import { describe, expect, test } from 'vitest';
import {
  bangkokDateStringToTransactionAt,
  getBangkokTodayDateString,
  getBangkokYesterdayDateString,
  getDefaultTransactionDateString,
  getGapDismissStorageKey,
  resolveInventoryHistoryTimestamp,
  shouldPromptTransactionDate,
  isValidTransactionDateString,
} from '@/lib/inventory-transaction-date';

describe('shouldPromptTransactionDate', () => {
  test('prompts in backfill mode for IN/OUT only', () => {
    expect(
      shouldPromptTransactionDate({
        backfillMode: true,
        hasYesterdayInOutGap: false,
        quickType: 'IN',
      }),
    ).toBe(true);
    expect(
      shouldPromptTransactionDate({
        backfillMode: true,
        hasYesterdayInOutGap: false,
        quickType: 'ADJUST',
      }),
    ).toBe(false);
  });

  test('prompts when yesterday has no IN/OUT ledger activity', () => {
    expect(
      shouldPromptTransactionDate({
        backfillMode: false,
        hasYesterdayInOutGap: true,
        quickType: 'OUT',
      }),
    ).toBe(true);
  });

  test('does not prompt in normal same-day flow', () => {
    expect(
      shouldPromptTransactionDate({
        backfillMode: false,
        hasYesterdayInOutGap: false,
        quickType: 'IN',
      }),
    ).toBe(false);
  });
});

describe('getDefaultTransactionDateString', () => {
  test('defaults to yesterday when gap warning is active', () => {
    expect(
      getDefaultTransactionDateString({
        backfillMode: false,
        hasYesterdayInOutGap: true,
        today: '2026-08-11',
        yesterday: '2026-08-10',
      }),
    ).toBe('2026-08-10');
  });

  test('defaults to today in backfill mode without gap', () => {
    expect(
      getDefaultTransactionDateString({
        backfillMode: true,
        hasYesterdayInOutGap: false,
        today: '2026-08-11',
        yesterday: '2026-08-10',
      }),
    ).toBe('2026-08-11');
  });
});

describe('bangkok date helpers', () => {
  test('maps yyyy-MM-dd to ISO with current Bangkok clock time on that day', () => {
    const now = new Date('2026-08-15T10:52:00+07:00');
    const iso = bangkokDateStringToTransactionAt('2026-08-14', now);
    expect(iso).toBe('2026-08-14T03:52:00.000Z');
  });

  test('resolveInventoryHistoryTimestamp uses created_at when transaction_at is absent', () => {
    const resolved = resolveInventoryHistoryTimestamp({
      created_at: '2026-08-15T03:52:00.000Z',
    });
    expect(resolved.toISOString()).toBe('2026-08-15T03:52:00.000Z');
  });

  test('resolveInventoryHistoryTimestamp keeps non-midnight transaction_at', () => {
    const resolved = resolveInventoryHistoryTimestamp({
      transaction_at: '2026-08-14T03:52:00.000Z',
      created_at: '2026-08-15T03:20:00.000Z',
    });
    expect(resolved.toISOString()).toBe('2026-08-14T03:52:00.000Z');
  });

  test('resolveInventoryHistoryTimestamp repairs legacy midnight backdates with created_at clock', () => {
    const resolved = resolveInventoryHistoryTimestamp({
      transaction_at: '2026-08-13T17:00:00.000Z',
      created_at: '2026-08-15T03:52:00.000Z',
    });
    expect(resolved.toISOString()).toBe('2026-08-14T03:52:00.000Z');
  });

  test('validates transaction date within allowed window', () => {
    expect(isValidTransactionDateString('2026-08-11', '2026-08-11', 90)).toBe(true);
    expect(isValidTransactionDateString('2026-08-12', '2026-08-11', 90)).toBe(false);
    expect(isValidTransactionDateString('2026-05-01', '2026-08-11', 90)).toBe(false);
  });

  test('gap dismiss key is scoped to yesterday date', () => {
    expect(getGapDismissStorageKey('2026-08-10')).toBe(
      'bb-inventory-inout-gap-dismissed:2026-08-10',
    );
  });

  test('today and yesterday in Bangkok timezone', () => {
    const now = new Date('2026-08-11T10:00:00+07:00');
    expect(getBangkokTodayDateString(now)).toBe('2026-08-11');
    expect(getBangkokYesterdayDateString(now)).toBe('2026-08-10');
  });
});
