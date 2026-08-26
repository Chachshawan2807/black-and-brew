import { describe, expect, test } from 'vitest';
import {
  getScheduleWeekDays,
  parseScheduleDateOnly,
  shiftBelongsToWeek,
  weekHasShiftData,
} from '@/lib/schedule/schedule-week-sync';

describe('schedule week sync helpers', () => {
  test('parseScheduleDateOnly keeps the requested calendar day in local time', () => {
    const parsed = parseScheduleDateOnly('2026-08-11');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(7);
    expect(parsed.getDate()).toBe(11);
  });

  test('getScheduleWeekDays returns Monday through Sunday for a week anchor', () => {
    expect(getScheduleWeekDays('2026-08-11')).toEqual([
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
      '2026-08-13',
      '2026-08-14',
      '2026-08-15',
      '2026-08-16',
    ]);
  });

  test('weekHasShiftData detects whether any shift belongs to the requested week', () => {
    const shifts = [
      {
        id: '1',
        employee_id: 'emp-1',
        start_time: '2026-08-12T00:00:00',
        end_time: '2026-08-12T23:59:59',
        status: 'scheduled',
        metadata: { location: '6:30' },
      },
    ];

    expect(weekHasShiftData(shifts, '2026-08-10', '2026-08-16')).toBe(true);
    expect(weekHasShiftData(shifts, '2026-08-17', '2026-08-23')).toBe(false);
    expect(shiftBelongsToWeek(shifts[0], '2026-08-10', '2026-08-16')).toBe(true);
  });
});
