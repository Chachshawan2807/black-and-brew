import { describe, expect, test } from 'vitest';
import {
  computeInventoryTargetRecommendation,
  formatTargetStockRecommendation,
} from '@/lib/inventory-recommended-target-stock';

describe('inventory recommended target stock', () => {
  test('formats compact current to recommended value only when recommendation is meaningfully higher', () => {
    expect(formatTargetStockRecommendation({ currentTargetStock: 20, recommendedTargetStock: 28 })).toBe('20 → 28');
    expect(formatTargetStockRecommendation({ currentTargetStock: 20, recommendedTargetStock: 21 })).toBe('20');
    expect(formatTargetStockRecommendation({ currentTargetStock: 20, recommendedTargetStock: 20 })).toBe('20');
  });

  test('adds lead time, holiday, and high shortage risk buffers to 14 day base usage', () => {
    const result = computeInventoryTargetRecommendation({
      currentTargetStock: 20,
      shortageRisk: 'high',
      leadTimeDays: 3,
      today: '2026-06-01',
      transactions: Array.from({ length: 14 }, (_, index) => ({
        type: 'OUT' as const,
        quantity: 2,
        created_at: `2026-05-${String(18 + index).padStart(2, '0')}T00:00:00Z`,
      })),
      holidays: [
        { date: '2026-06-05', name: 'Holiday A' },
        { date: '2026-06-06', name: 'Holiday B' },
        { date: '2026-06-07', name: 'Holiday C' },
      ],
    });

    expect(result.averageDailyUsage).toBe(2);
    expect(result.baseUsage14Days).toBe(28);
    expect(result.leadTimeBuffer).toBe(6);
    expect(result.shortageRiskBuffer).toBeCloseTo(8.4);
    expect(result.holidayBuffer).toBeCloseTo(14);
    expect(result.recommendedTargetStock).toBe(57);
    expect(result.displayValue).toBe('20 → 57');
  });

  test('reduces the impact of abnormal OUT transactions', () => {
    const result = computeInventoryTargetRecommendation({
      currentTargetStock: 10,
      shortageRisk: 'normal',
      leadTimeDays: 0,
      today: '2026-06-01',
      transactions: [
        { type: 'OUT', quantity: 2, created_at: '2026-05-20T00:00:00Z' },
        { type: 'OUT', quantity: 2, created_at: '2026-05-21T00:00:00Z' },
        { type: 'OUT', quantity: 2, created_at: '2026-05-22T00:00:00Z' },
        { type: 'OUT', quantity: 50, created_at: '2026-05-23T00:00:00Z' },
      ],
      holidays: [],
    });

    expect(result.abnormalOutCount).toBe(1);
    expect(result.averageDailyUsage).toBeCloseTo(0.5);
    expect(result.recommendedTargetStock).toBe(7);
    expect(result.confidence).toBe('ข้อมูลน้อย');
  });

  test('uses percentile outlier handling when repeated large OUT rows would raise the median', () => {
    const result = computeInventoryTargetRecommendation({
      currentTargetStock: 20,
      shortageRisk: 'normal',
      leadTimeDays: 0,
      today: '2026-06-01',
      transactions: [
        { type: 'OUT', quantity: 2, created_at: '2026-05-20T00:00:00Z' },
        { type: 'OUT', quantity: 2, created_at: '2026-05-21T00:00:00Z' },
        { type: 'OUT', quantity: 2, created_at: '2026-05-22T00:00:00Z' },
        { type: 'OUT', quantity: 2, created_at: '2026-05-23T00:00:00Z' },
        { type: 'OUT', quantity: 25, created_at: '2026-05-24T00:00:00Z' },
        { type: 'OUT', quantity: 26, created_at: '2026-05-25T00:00:00Z' },
        { type: 'OUT', quantity: 27, created_at: '2026-05-26T00:00:00Z' },
        { type: 'OUT', quantity: 120, created_at: '2026-05-27T00:00:00Z' },
      ],
      holidays: [],
    });

    expect(result.abnormalOutCount).toBe(4);
    expect(result.recommendedTargetStock).toBe(10);
  });
});
