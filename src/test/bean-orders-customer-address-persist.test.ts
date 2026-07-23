import { describe, expect, test } from 'vitest';
import {
  customerAddressAlreadyExists,
  mergeCustomerAddressProfiles,
  shouldPersistCustomerAddress,
} from '@/lib/bean-orders/customer-address-persist';

describe('bean customer address persist helpers', () => {
  test('should persist when address and name are present', () => {
    expect(
      shouldPersistCustomerAddress({
        recipientName: 'คุณเอ',
        recipientAddress: '123/4 ถนนสุขุมวิท',
      }),
    ).toBe(true);
  });

  test('should not persist when address is empty', () => {
    expect(
      shouldPersistCustomerAddress({
        recipientName: 'คุณเอ',
        recipientAddress: '   ',
      }),
    ).toBe(false);
  });

  test('detects duplicate saved addresses by line and postal code', () => {
    const existing = [
      {
        addressLine: '123/4 ถนนสุขุมวิท',
        province: 'กรุงเทพมหานคร',
        postalCode: '10110',
      },
    ];

    expect(
      customerAddressAlreadyExists(existing, {
        addressLine: '123/4  ถนนสุขุมวิท',
        province: 'กรุงเทพมหานคร',
        postalCode: '10110',
      }),
    ).toBe(true);

    expect(
      customerAddressAlreadyExists(existing, {
        addressLine: '99/1 ถนนรามคำแหง',
        province: 'กรุงเทพมหานคร',
        postalCode: '10240',
      }),
    ).toBe(false);
  });

  test('merges saved and history profiles without duplicates', () => {
    const profile = {
      name: 'คุณเอ',
      phone: '0812345678',
      postalCode: '10110',
      areaId: 'area-1',
      subdistrict: 'คลองตัน',
      district: 'คลองเตย',
      province: 'กรุงเทพมหานคร',
      addressLine: '123/4',
    };

    const merged = mergeCustomerAddressProfiles([profile], [profile, { ...profile, phone: '0899999999' }]);

    expect(merged).toHaveLength(2);
    expect(merged.map((row) => row.phone).sort()).toEqual(['0812345678', '0899999999']);
  });
});
