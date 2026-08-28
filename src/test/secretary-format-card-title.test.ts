import { describe, expect, test } from 'vitest';
import { splitSecretaryCardTitle } from '@/lib/secretary/format-card-title';

describe('splitSecretaryCardTitle', () => {
  test('keeps count suffix on its own line', () => {
    expect(splitSecretaryCardTitle('เบิกของสาขา 2 (8 รายการ)')).toEqual([
      'เบิกของสาขา 2',
      '(8 รายการ)',
    ]);
  });

  test('splits before รอ and keeps count suffix separate', () => {
    expect(splitSecretaryCardTitle('ออเดอร์เมล็ดรอตรวจสอบ (1)')).toEqual([
      'ออเดอร์เมล็ด',
      'รอตรวจสอบ',
      '(1)',
    ]);
  });

  test('splits em dash headlines', () => {
    expect(splitSecretaryCardTitle('ตรวจตาราง — วันที่คนน้อย')).toEqual([
      'ตรวจตาราง',
      '— วันที่คนน้อย',
    ]);
  });

  test('returns single line for short custom tasks', () => {
    expect(splitSecretaryCardTitle('นับสต็อก')).toEqual(['นับสต็อก']);
  });
});
