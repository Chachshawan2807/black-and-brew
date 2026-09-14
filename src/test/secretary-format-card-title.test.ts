import { describe, expect, test } from 'vitest';
import {
  resolveSecretaryCardTitleFontClass,
  splitSecretaryCardTitle,
} from '@/lib/secretary/format-card-title';

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

  test('splits space-separated headlines', () => {
    expect(splitSecretaryCardTitle('ตรวจตาราง วันที่คนน้อย')).toEqual([
      'ตรวจตาราง',
      'วันที่คนน้อย',
    ]);
  });

  test('wraps long mixed-language titles for mobile cards', () => {
    const title = 'ตรวจ bean orders และสต็อกคลังที่เกี่ยวข้อง';
    const lines = splitSecretaryCardTitle(title);
    expect(lines.length).toBeGreaterThanOrEqual(3);
    expect(lines.every((line) => line.length <= 17)).toBe(true);
    expect(lines.join(' ').replace(/\s+/g, ' ')).toContain('ตรวจ bean');
    expect(lines.join('').replace(/\s+/g, '')).toBe(title.replace(/\s+/g, ''));
  });

  test('returns single line for short custom tasks', () => {
    expect(splitSecretaryCardTitle('นับสต็อก')).toEqual(['นับสต็อก']);
  });
});

describe('resolveSecretaryCardTitleFontClass', () => {
  test('uses default size for short titles', () => {
    const classes = resolveSecretaryCardTitleFontClass(2);
    expect(classes).toContain('14px');
    expect(classes).toContain('md:text-[clamp(14px,2.1vw,17px)]');
  });

  test('shrinks font for longer wrapped titles', () => {
    const classes = resolveSecretaryCardTitleFontClass(4);
    expect(classes).toContain('11px');
    expect(classes).toContain('md:text-[clamp(12px,1.65vw,14px)]');
  });
});
