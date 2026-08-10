import { describe, expect, test } from 'vitest';
import {
  formatScheduleWeekRangeLabel,
  SCHEDULE_SHEETS_SYNC_POLICY,
} from '@/lib/schedule/sheets-sync-policy';

describe('sheets-sync-policy', () => {
  test('enforces manual-only single-week sync policy', () => {
    expect(SCHEDULE_SHEETS_SYNC_POLICY.manualOnly).toBe(true);
    expect(SCHEDULE_SHEETS_SYNC_POLICY.singleWeekOnly).toBe(true);
  });

  test('formatScheduleWeekRangeLabel shows Mon–Sun range', () => {
    expect(formatScheduleWeekRangeLabel('2026-07-27', '2026-08-02')).toBe(
      '27/07/2026 – 02/08/2026',
    );
  });
});
