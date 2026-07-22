import type { BeanOrderLineInput, BeanOrderTotals, WeightUnit } from './types';

export function weightToKg(value: number, unit: WeightUnit): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return unit === 'g' ? value / 1000 : value;
}

export function computeLineTotal(
  weightValue: number,
  weightUnit: WeightUnit,
  unitPricePerKg: number,
): number {
  const kg = weightToKg(weightValue, weightUnit);
  const price = Number.isFinite(unitPricePerKg) ? unitPricePerKg : 0;
  return roundBaht(kg * price);
}

export function computeOrderTotals(
  lines: BeanOrderLineInput[],
  discountBaht: number,
  shippingBaht: number,
): BeanOrderTotals {
  const subtotalBaht = roundBaht(
    lines.reduce(
      (sum, line) =>
        sum +
        computeLineTotal(line.weightValue, line.weightUnit, line.unitPricePerKg),
      0,
    ),
  );
  const discount = sanitizeBaht(discountBaht);
  const shipping = sanitizeBaht(shippingBaht);
  const totalBaht = roundBaht(Math.max(0, subtotalBaht - discount + shipping));

  return { subtotalBaht, discountBaht: discount, shippingBaht: shipping, totalBaht };
}

function sanitizeBaht(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return roundBaht(value);
}

function roundBaht(value: number): number {
  return Math.round(value * 100) / 100;
}
