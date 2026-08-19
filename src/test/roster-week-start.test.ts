import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseISO } from 'date-fns';
import {
  ROSTER_INDIVIDUAL_DAY_LABELS_FULL,
  ROSTER_INDIVIDUAL_DAY_LABELS_SHORT,
  mondayStartPadCount,
} from '@/lib/roster/week-start';

describe('individual roster week start', () => {
  test('day headers run Monday through Sunday', () => {
    expect(ROSTER_INDIVIDUAL_DAY_LABELS_SHORT).toEqual(['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.']);
    expect(ROSTER_INDIVIDUAL_DAY_LABELS_FULL).toEqual([
      'จันทร์',
      'อังคาร',
      'พุธ',
      'พฤหัสบดี',
      'ศุกร์',
      'เสาร์',
      'อาทิตย์',
    ]);
  });

  test('leading empty cells align the first date to a Monday-start grid', () => {
    expect(mondayStartPadCount(parseISO('2026-08-03'))).toBe(0);
    expect(mondayStartPadCount(parseISO('2026-08-01'))).toBe(5);
    expect(mondayStartPadCount(parseISO('2026-08-02'))).toBe(6);
  });

  test('MonthlyRoster individual calendar uses Monday-start labels and padding', () => {
    const code = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/dashboard/_components/MonthlyRoster.tsx'),
      'utf-8',
    );
    expect(code).toContain('ROSTER_INDIVIDUAL_DAY_LABELS_FULL');
    expect(code).toContain('mondayStartPadCount');
    expect(code).not.toContain("['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']");
  });
});
