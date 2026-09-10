import { describe, expect, test } from 'vitest';
import { formatDateRangePickerLabel } from '@/lib/date-utils';

describe('formatDateRangePickerLabel', () => {
  test('shows hyphenated placeholders when empty', () => {
    expect(formatDateRangePickerLabel()).toBe('เริ่ม-สิ้นสุด');
  });

  test('shows hyphen between partial selection and placeholder', () => {
    expect(formatDateRangePickerLabel('2026-09-01')).toBe('01/09/2026-สิ้นสุด');
    expect(formatDateRangePickerLabel(undefined, '2026-09-15')).toBe('เริ่ม-15/09/2026');
  });

  test('shows a single date when start and end are the same day', () => {
    expect(formatDateRangePickerLabel('2026-09-10', '2026-09-10')).toBe('10/09/2026');
  });

  test('shows compact same-month range with hyphen between days', () => {
    expect(formatDateRangePickerLabel('2026-09-01', '2026-09-15')).toBe('01-15/09/2026');
  });

  test('shows hyphen between full dates for cross-month ranges', () => {
    expect(formatDateRangePickerLabel('2026-09-30', '2026-10-02')).toBe('30/09/2026-02/10/2026');
  });
});
