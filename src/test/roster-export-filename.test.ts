import { describe, expect, it } from 'vitest';
import {
  buildRosterIndividualExportFilename,
  sanitizeRosterExportEmployeeName,
} from '@/lib/roster-export-filename';

describe('roster-export-filename', () => {
  it('builds a filename with sanitized employee name and date range', () => {
    expect(
      buildRosterIndividualExportFilename('สมชาย ใจดี', '2026-01-01', '2026-01-31'),
    ).toBe('Roster-Individual-สมชาย-ใจดี-2026-01-01-2026-01-31.png');
  });

  it('removes unsafe filename characters from employee names', () => {
    expect(sanitizeRosterExportEmployeeName('A/B:C*')).toBe('ABC');
  });

  it('falls back when employee name is empty after sanitization', () => {
    expect(buildRosterIndividualExportFilename('   ', '2026-01-01', '2026-01-31')).toBe(
      'Roster-Individual-employee-2026-01-01-2026-01-31.png',
    );
  });
});
