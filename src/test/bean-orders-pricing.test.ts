import { describe, expect, test } from 'vitest';
import {
  computeLineTotal,
  computeOrderTotals,
  weightToKg,
} from '@/lib/bean-orders/pricing';

describe('weightToKg', () => {
  test('converts grams to kg', () => {
    expect(weightToKg(500, 'g')).toBe(0.5);
    expect(weightToKg(1000, 'g')).toBe(1);
  });

  test('keeps kg as-is', () => {
    expect(weightToKg(2, 'kg')).toBe(2);
  });

  test('returns 0 for invalid input', () => {
    expect(weightToKg(-1, 'g')).toBe(0);
    expect(weightToKg(Number.NaN, 'kg')).toBe(0);
  });
});

describe('computeLineTotal', () => {
  test('500g at 400 baht/kg = 200 baht', () => {
    expect(computeLineTotal(500, 'g', 400)).toBe(200);
  });

  test('1kg at 350 baht/kg = 350 baht', () => {
    expect(computeLineTotal(1, 'kg', 350)).toBe(350);
  });
});

describe('computeOrderTotals', () => {
  test('sums lines, subtracts discount, adds shipping', () => {
    const totals = computeOrderTotals(
      [
        { inventoryItemId: 'a', weightValue: 500, weightUnit: 'g', unitPricePerKg: 400 },
        { inventoryItemId: 'b', weightValue: 1, weightUnit: 'kg', unitPricePerKg: 300 },
      ],
      50,
      60,
    );
    expect(totals.subtotalBaht).toBe(500);
    expect(totals.discountBaht).toBe(50);
    expect(totals.shippingBaht).toBe(60);
    expect(totals.totalBaht).toBe(510);
  });

  test('total never goes below zero', () => {
    const totals = computeOrderTotals(
      [{ inventoryItemId: 'a', weightValue: 100, weightUnit: 'g', unitPricePerKg: 100 }],
      999,
      0,
    );
    expect(totals.totalBaht).toBe(0);
  });
});
