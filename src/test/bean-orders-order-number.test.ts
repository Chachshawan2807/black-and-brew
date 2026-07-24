import { describe, expect, test } from 'vitest';
import {
  buildBeanOrderNoDatePrefix,
  formatBeanOrderNo,
  nextBeanOrderSequence,
  parseBeanOrderNoDatePrefix,
  parseBeanOrderNoSequence,
} from '@/lib/bean-orders/order-number';

describe('formatBeanOrderNo', () => {
  test('formats daily sequence with zero padding', () => {
    expect(formatBeanOrderNo(new Date(2026, 6, 22), 1)).toBe('BO-20260722-001');
    expect(formatBeanOrderNo(new Date(2026, 6, 22), 42)).toBe('BO-20260722-042');
  });
});

describe('buildBeanOrderNoDatePrefix', () => {
  test('builds BO-YYYYMMDD prefix from calendar date', () => {
    expect(buildBeanOrderNoDatePrefix(new Date(2026, 6, 24))).toBe('BO-20260724');
  });
});

describe('parseBeanOrderNoSequence', () => {
  test('extracts daily sequence from valid order no', () => {
    expect(parseBeanOrderNoSequence('BO-20260724-007')).toBe(7);
  });

  test('returns null for invalid format', () => {
    expect(parseBeanOrderNoSequence('ORDER-123')).toBeNull();
  });
});

describe('nextBeanOrderSequence', () => {
  test('starts at 1 when no prior order exists', () => {
    expect(nextBeanOrderSequence(null)).toBe(1);
  });

  test('increments from highest existing order number', () => {
    expect(nextBeanOrderSequence('BO-20260724-003')).toBe(4);
  });

  test('does not reuse sequence when prior orders were deleted', () => {
    expect(nextBeanOrderSequence('BO-20260724-005')).toBe(6);
  });
});

describe('parseBeanOrderNoDatePrefix', () => {
  test('extracts date prefix from valid order no', () => {
    expect(parseBeanOrderNoDatePrefix('BO-20260722-001')).toBe('20260722');
  });

  test('returns null for invalid format', () => {
    expect(parseBeanOrderNoDatePrefix('ORDER-123')).toBeNull();
  });
});
