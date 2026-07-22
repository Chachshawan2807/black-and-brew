import { describe, expect, test } from 'vitest';
import {
  dedupeAddressProfiles,
  formatAddressProfileLabel,
  formatOrderDeliveryDestination,
  parseThaiPostalAddressLine,
} from '@/lib/bean-orders/address';

describe('bean order address helpers', () => {
  test('parses stored address with province and postal code', () => {
    const parsed = parseThaiPostalAddressLine('123/4 ถนนสุขุมวิท', {
      name: 'คุณเอ',
      phone: '0812345678',
      province: 'กรุงเทพมหานคร',
      postalCode: '10110',
    });

    expect(parsed.name).toBe('คุณเอ');
    expect(parsed.phone).toBe('0812345678');
    expect(parsed.postalCode).toBe('10110');
    expect(parsed.addressLine).toBe('123/4 ถนนสุขุมวิท');
  });

  test('dedupes identical address profiles', () => {
    const profiles = dedupeAddressProfiles([
      {
        name: 'A',
        phone: '1',
        postalCode: '10110',
        areaId: 'x',
        subdistrict: 'a',
        district: 'b',
        province: 'c',
        addressLine: 'line',
      },
      {
        name: 'A',
        phone: '1',
        postalCode: '10110',
        areaId: 'x',
        subdistrict: 'a',
        district: 'b',
        province: 'c',
        addressLine: 'line',
      },
    ]);

    expect(profiles).toHaveLength(1);
  });

  test('formats profile label for picker', () => {
    expect(
      formatAddressProfileLabel({
        name: 'A',
        phone: '081',
        postalCode: '50000',
        areaId: '',
        subdistrict: 'ศรีภูมิ',
        district: 'เมืองเชียงใหม่',
        province: 'เชียงใหม่',
        addressLine: '123',
      }),
    ).toContain('081');
  });

  test('formats delivery destination for order list', () => {
    expect(
      formatOrderDeliveryDestination({
        recipientAddress: '123 หมู่ 4',
        recipientProvince: 'ระยอง',
        recipientPostalCode: '21110',
      }),
    ).toBe('จ.ระยอง');
  });
});
