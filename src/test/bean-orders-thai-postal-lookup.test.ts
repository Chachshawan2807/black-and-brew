import { describe, expect, test } from 'vitest';
import {
  formatThaiAdminAreaLabel,
  formatThaiPostalAddressLine,
  lookupThaiPostalAreas,
  normalizeThaiPostalCode,
  resolveThaiAdminAreaNames,
} from '@/lib/bean-orders/thai-postal-lookup';

describe('thai postal lookup', () => {
  test('normalizes postal code to 5 digits', () => {
    expect(normalizeThaiPostalCode('10-200')).toBe('10200');
    expect(normalizeThaiPostalCode('102001')).toBe('10200');
  });

  test('returns area options for a valid postal code', () => {
    const areas = lookupThaiPostalAreas('50200');
    expect(areas.length).toBeGreaterThan(0);
    expect(areas[0]).toMatchObject({
      province: 'เชียงใหม่',
      postalCode: '50200',
    });
  });

  test('returns empty list for incomplete postal code', () => {
    expect(lookupThaiPostalAreas('502')).toEqual([]);
  });

  test('formats a full Thai address line', () => {
    expect(
      formatThaiPostalAddressLine({
        addressLine: '123/4 ถนนสุขุมวิท',
        subdistrict: 'คลองตัน',
        district: 'คลองเตย',
        province: 'กรุงเทพมหานคร',
        postalCode: '10110',
      }),
    ).toBe('123/4 ถนนสุขุมวิท คลองตัน คลองเตย กรุงเทพมหานคร 10110');
  });

  test('resolves English tracking location names to Thai', () => {
    expect(
      resolveThaiAdminAreaNames({
        district: 'Wang Chan',
        province: 'Rayong',
      }),
    ).toEqual({
      subdistrict: null,
      district: 'วังจันทร์',
      province: 'ระยอง',
    });
  });

  test('formats Thai admin area labels with full prefixes', () => {
    expect(
      formatThaiAdminAreaLabel({
        district: 'Lam Luk Ka',
        province: 'Pathum Thani',
      }),
    ).toBe('อ.ลำลูกกา จ.ปทุมธานี');
  });
});
