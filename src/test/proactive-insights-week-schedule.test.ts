import { describe, expect, test } from 'vitest';
import type { WeeklyDaySchedule } from '@/lib/proactive-insights/types';
import { findUnderstaffedDays, isDayUnderstaffed } from '@/lib/proactive-insights/week-schedule';

function day(
  overrides: Partial<WeeklyDaySchedule> & Pick<WeeklyDaySchedule, 'dayIndex' | 'headcount'>,
): WeeklyDaySchedule {
  return {
    dateIso: `2026-07-${20 + overrides.dayIndex}`,
    leaveCount: 0,
    leaveStaff: [],
    isPublicHoliday: false,
    ...overrides,
  };
}

describe('isDayUnderstaffed', () => {
  test('uses weekday limits on regular days', () => {
    expect(isDayUnderstaffed(day({ dayIndex: 0, headcount: 3 }))).toBe(true);
    expect(isDayUnderstaffed(day({ dayIndex: 0, headcount: 4 }))).toBe(false);
    expect(isDayUnderstaffed(day({ dayIndex: 2, headcount: 4 }))).toBe(true);
    expect(isDayUnderstaffed(day({ dayIndex: 2, headcount: 5 }))).toBe(false);
  });

  test('uses public holiday limit when day is a public holiday', () => {
    expect(isDayUnderstaffed(day({ dayIndex: 2, headcount: 4, isPublicHoliday: true }))).toBe(true);
    expect(isDayUnderstaffed(day({ dayIndex: 2, headcount: 5, isPublicHoliday: true }))).toBe(false);
    expect(isDayUnderstaffed(day({ dayIndex: 0, headcount: 4, isPublicHoliday: true }))).toBe(true);
  });
});

describe('findUnderstaffedDays', () => {
  test('includes public holiday days at or below holiday headcount limit', () => {
    const understaffed = findUnderstaffedDays([
      day({ dayIndex: 2, headcount: 5, isPublicHoliday: true }),
      day({ dayIndex: 3, headcount: 4, isPublicHoliday: true }),
    ]);

    expect(understaffed).toHaveLength(1);
    expect(understaffed[0]?.dayIndex).toBe(3);
  });
});
