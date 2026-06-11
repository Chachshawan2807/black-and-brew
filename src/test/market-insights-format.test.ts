import { describe, expect, test } from 'vitest';
import {
  fmtCurrency,
  fmtPctChange,
  fmtMonthLabel,
  fmtInteger,
} from '@/lib/market-insights/format';

describe('market-insights format', () => {
  test('fmtCurrency uses THB with grouping', () => {
    expect(fmtCurrency(12345)).toContain('12');
    expect(fmtCurrency(12345)).toMatch(/฿|THB/);
  });

  test('fmtPctChange shows signed percentage', () => {
    expect(fmtPctChange(11.1)).toBe('+11.1%');
    expect(fmtPctChange(-5.2)).toBe('-5.2%');
    expect(fmtPctChange(null)).toBe('N/A');
  });

  test('fmtMonthLabel formats YYYY-MM to Thai short month', () => {
    const label = fmtMonthLabel('2026-02');
    expect(label).toBeTruthy();
    expect(label).not.toBe('2026-02');
  });

  test('fmtInteger groups thousands', () => {
    expect(fmtInteger(1234)).toBe('1,234');
  });
});
