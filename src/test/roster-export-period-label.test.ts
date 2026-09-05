import { describe, expect, test } from 'vitest';
import { formatRosterExportPeriodLabel } from '@/lib/roster/export-period-label';

describe('formatRosterExportPeriodLabel', () => {
  test('formats a full calendar month as month and year', () => {
    expect(formatRosterExportPeriodLabel('2026-09-01', '2026-09-30')).toBe('กันยายน 2026');
  });

  test('formats a single day', () => {
    expect(formatRosterExportPeriodLabel('2026-09-04', '2026-09-04')).toBe('4 กันยายน 2026');
  });

  test('formats a partial month within the same month', () => {
    expect(formatRosterExportPeriodLabel('2026-09-01', '2026-09-15')).toBe('1-15 กันยายน 2026');
  });

  test('formats a cross-month range', () => {
    expect(formatRosterExportPeriodLabel('2026-08-26', '2026-09-06')).toBe(
      '26 ส.ค. 2026 - 6 ก.ย. 2026',
    );
  });
});
