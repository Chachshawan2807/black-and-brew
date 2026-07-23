import { describe, expect, test } from 'vitest';
import {
  dedupeAddressProfiles,
  finalizeCustomerAddress,
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

  test('strips postal area fields from address line when structured fields are populated', () => {
    const parsed = parseThaiPostalAddressLine('99/5 หมู่1 ต.ป่ายุบใน อ.วังจันทร์ จ.ระยอง 21210');

    expect(parsed.postalCode).toBe('21210');
    expect(parsed.subdistrict).toBe('ป่ายุบใน');
    expect(parsed.district).toBe('วังจันทร์');
    expect(parsed.province).toBe('ระยอง');
    expect(parsed.addressLine).toBe('99/5 หมู่1');
    expect(parsed.addressLine).not.toContain('21210');
    expect(parsed.addressLine).not.toContain('ระยอง');
    expect(parsed.addressLine).not.toContain('วังจันทร์');
    expect(parsed.addressLine).not.toContain('ป่ายุบใน');
  });

  test('strips plain locality suffix without Thai prefixes', () => {
    const parsed = parseThaiPostalAddressLine('99/5 ป่ายุบใน วังจันทร์ ระยอง 21210');

    expect(parsed.subdistrict).toBe('ป่ายุบใน');
    expect(parsed.addressLine).toBe('99/5');
  });

  test('extracts postal code and area when shop name follows postal code', () => {
    const parsed = parseThaiPostalAddressLine(
      '99/5 หมู่1 ต.ป่ายุบใน อ.วังจันทร์ จ.ระยอง 21210 ร้านบลูเดย์',
    );

    expect(parsed.postalCode).toBe('21210');
    expect(parsed.subdistrict).toBe('ป่ายุบใน');
    expect(parsed.district).toBe('วังจันทร์');
    expect(parsed.province).toBe('ระยอง');
    expect(parsed.areaId).toBeTruthy();
    expect(parsed.addressLine).toBe('99/5 หมู่1 ร้านบลูเดย์');
  });

  test('finalizeCustomerAddress removes duplicate phrases and locality fields', () => {
    const parsed = parseThaiPostalAddressLine(
      '99/5 หมู่1 ต.ป่ายุบใน อ.วังจันทร์ จ.ระยอง 21210 ร้านบลูเดย์',
    );
    const dirty = {
      ...parsed,
      addressLine:
        '99/5 หมู่1 ต.ป่ายุบใน อ.วังจันทร์ จ.ระยอง 21210 ร้านบลูเดย์ 99/5 หมู่1 ร้านบลูเดย์',
    };

    expect(finalizeCustomerAddress(dirty).addressLine).toBe('99/5 หมู่1 ร้านบลูเดย์');
  });
});
