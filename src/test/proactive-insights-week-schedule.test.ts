import { describe, expect, test } from 'vitest';
import {
  findUnderstaffedDays,
  getWeekDateIsos,
  isDayUnderstaffed,
  sumWeeklyLeave,
} from '@/lib/proactive-insights/week-schedule';

describe('getWeekDateIsos', () => {
  test('returns Monday through Sunday for anchor in same week', () => {
    expect(getWeekDateIsos('2026-07-24')).toEqual([
      '2026-07-20',
      '2026-07-21',
      '2026-07-22',
      '2026-07-23',
      '2026-07-24',
      '2026-07-25',
      '2026-07-26',
    ]);
  });
});

describe('isDayUnderstaffed', () => {
  test('uses per-day headcount limits', () => {
    expect(isDayUnderstaffed(0, 3)).toBe(true);
    expect(isDayUnderstaffed(0, 4)).toBe(false);
    expect(isDayUnderstaffed(2, 4)).toBe(true);
    expect(isDayUnderstaffed(2, 5)).toBe(false);
  });
});

describe('findUnderstaffedDays', () => {
  test('returns only days at or below their limit', () => {
    const days = [
      { dateIso: '2026-07-20', dayIndex: 0, headcount: 3, leaveCount: 0 },
      { dateIso: '2026-07-21', dayIndex: 1, headcount: 5, leaveCount: 0 },
    ];
    expect(findUnderstaffedDays(days)).toHaveLength(1);
    expect(findUnderstaffedDays(days)[0]?.dayIndex).toBe(0);
  });
});

describe('sumWeeklyLeave', () => {
  test('sums leave counts across the week', () => {
    const days = [
      { dateIso: 'a', dayIndex: 0, headcount: 5, leaveCount: 1 },
      { dateIso: 'b', dayIndex: 1, headcount: 5, leaveCount: 2 },
    ];
    expect(sumWeeklyLeave(days)).toBe(3);
  });
});
