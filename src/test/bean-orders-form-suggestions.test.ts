import { describe, expect, test } from 'vitest';
import {
  filterStringSuggestions,
  profilesMatchingName,
  uniqueFieldValues,
} from '@/lib/bean-orders/form-suggestions';
import type { ThaiPostalAddressValue } from '@/lib/bean-orders/address';

const profiles: ThaiPostalAddressValue[] = [
  {
    name: 'คุณเอ',
    phone: '0811111111',
    postalCode: '50000',
    areaId: 'a',
    subdistrict: 'ศรีภูมิ',
    district: 'เมืองเชียงใหม่',
    province: 'เชียงใหม่',
    addressLine: '123',
  },
  {
    name: 'คุณเอ',
    phone: '0822222222',
    postalCode: '10110',
    areaId: 'b',
    subdistrict: 'คลองตัน',
    district: 'คลองเตย',
    province: 'กรุงเทพมหานคร',
    addressLine: '456',
  },
];

describe('bean order form suggestions', () => {
  test('filters suggestions by substring from first character', () => {
    expect(filterStringSuggestions(['เชียงใหม่', 'กรุงเทพ'], 'เชีย')).toEqual(['เชียงใหม่']);
  });

  test('returns unique field values that match query', () => {
    expect(uniqueFieldValues(profiles, 'phone', '081')).toEqual(['0811111111']);
  });

  test('groups profiles by exact name', () => {
    expect(profilesMatchingName(profiles, 'คุณเอ')).toHaveLength(2);
  });
});
