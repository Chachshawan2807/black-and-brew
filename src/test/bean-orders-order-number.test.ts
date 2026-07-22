import { describe, expect, test } from 'vitest';
import { formatBeanOrderNo, parseBeanOrderNoDatePrefix } from '@/lib/bean-orders/order-number';

describe('formatBeanOrderNo', () => {
  test('formats daily sequence with zero padding', () => {
    expect(formatBeanOrderNo(new Date(2026, 6, 22), 1)).toBe('BO-20260722-001');
    expect(formatBeanOrderNo(new Date(2026, 6, 22), 42)).toBe('BO-20260722-042');
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
