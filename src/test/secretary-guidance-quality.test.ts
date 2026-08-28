import { describe, expect, test } from 'vitest';
import {
  isUsableGuidanceText,
  normalizeGuidanceText,
  resolveGuidanceText,
} from '@/lib/secretary/guidance-quality';

describe('secretary guidance quality', () => {
  test('rejects truncated AI fragments', () => {
    expect(isUsableGuidanceText('ให้ทำซ่อมบ', 3)).toBe(false);
  });

  test('accepts complete guidance sentences', () => {
    expect(
      isUsableGuidanceText(
        'แนะนำเริ่มจาก "ซ่อมบำรุงเลยกำหนด (4)" ก่อน แล้วต่อด้วย "สั่งซื้อสินค้า (9 รายการ)"',
        3,
      ),
    ).toBe(true);
  });

  test('resolveGuidanceText falls back when AI output is too short', () => {
    const fallback =
      'แนะนำเริ่มจาก "ซ่อมบำรุงเลยกำหนด (4)" ก่อน แล้วต่อด้วย "สั่งซื้อสินค้า (9 รายการ)"';
    expect(resolveGuidanceText('ให้ทำซ่อมบ', fallback, 3)).toBe(fallback);
  });

  test('normalizeGuidanceText collapses whitespace', () => {
    expect(normalizeGuidanceText('  แนะนำ   เริ่ม  ')).toBe('แนะนำ เริ่ม');
  });
});
