import { describe, expect, test } from 'vitest';
import {
  bangkokDateStringToTransactionAt,
  getBangkokTodayDateString,
  getBangkokYesterdayDateString,
  getDefaultTransactionDateString,
  getGapDismissStorageKey,
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
  test('maps yyyy-MM-dd to ISO at Bangkok start of day', () => {
    const iso = bangkokDateStringToTransactionAt('2026-08-10');
    expect(iso).toMatch(/^2026-08-09T17:00:00\.000Z$/);
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
