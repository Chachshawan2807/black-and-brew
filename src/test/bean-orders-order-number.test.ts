import { describe, expect, test } from 'vitest';
import {
  buildBeanOrderNoDatePrefix,
  formatBeanOrderNo,
  maxBeanOrderSequence,
  nextBeanOrderSequence,
  parseBeanOrderNoDatePrefix,
  parseBeanOrderNoSequence,
} from '@/lib/bean-orders/order-number';

describe('formatBeanOrderNo', () => {
  test('formats daily sequence without leading zeros', () => {
    expect(formatBeanOrderNo(new Date(2026, 6, 22), 1)).toBe('BO-20260722-1');
    expect(formatBeanOrderNo(new Date(2026, 6, 22), 42)).toBe('BO-20260722-42');
  });
});

describe('buildBeanOrderNoDatePrefix', () => {
  test('builds BO-YYYYMMDD prefix from calendar date', () => {
    expect(buildBeanOrderNoDatePrefix(new Date(2026, 6, 24))).toBe('BO-20260724');
  });
});

describe('parseBeanOrderNoSequence', () => {
  test('extracts daily sequence from valid order no', () => {
    expect(parseBeanOrderNoSequence('BO-20260724-7')).toBe(7);
    expect(parseBeanOrderNoSequence('BO-20260724-007')).toBe(7);
  });

  test('returns null for invalid format', () => {
    expect(parseBeanOrderNoSequence('ORDER-123')).toBeNull();
  });
});

describe('maxBeanOrderSequence', () => {
  test('returns highest sequence across order numbers', () => {
    expect(
      maxBeanOrderSequence(['BO-20260724-1', 'BO-20260724-12', 'BO-20260724-3']),
    ).toBe(12);
  });

  test('returns 0 when no valid order numbers exist', () => {
    expect(maxBeanOrderSequence([])).toBe(0);
    expect(maxBeanOrderSequence(['invalid'])).toBe(0);
  });
});

describe('nextBeanOrderSequence', () => {
  test('starts at 1 when no prior order exists', () => {
    expect(nextBeanOrderSequence(null)).toBe(1);
  });

  test('increments from highest existing order number', () => {
    expect(nextBeanOrderSequence('BO-20260724-3')).toBe(4);
  });

  test('does not reuse sequence when prior orders were deleted', () => {
    expect(nextBeanOrderSequence('BO-20260724-5')).toBe(6);
  });
});

describe('parseBeanOrderNoDatePrefix', () => {
  test('extracts date prefix from valid order no', () => {
    expect(parseBeanOrderNoDatePrefix('BO-20260722-1')).toBe('20260722');
  });

  test('returns null for invalid format', () => {
    expect(parseBeanOrderNoDatePrefix('ORDER-123')).toBeNull();
  });
});
