import { describe, expect, test } from 'vitest';
import { startOfWeek, addDays, format, startOfMonth, endOfMonth } from 'date-fns';
import {
  DASHBOARD_ROSTER_END_COOKIE,
  DASHBOARD_ROSTER_START_COOKIE,
  DASHBOARD_WEEKLY_END_COOKIE,
  DASHBOARD_WEEKLY_START_COOKIE,
  resolveDashboardDateRange,
} from '@/lib/dashboard-date-range';

describe('resolveDashboardDateRange', () => {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const sunday = addDays(monday, 6);
  const fallbackStart = format(monday, 'yyyy-MM-dd');
  const fallbackEnd = format(sunday, 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

  test('prioritizes URL params over cookies and fallback', () => {
    const result = resolveDashboardDateRange({
      urlStart: '2026-05-01',
      urlEnd: '2026-05-07',
      cookieStart: '2026-04-10',
      cookieEnd: '2026-04-16',
      fallbackStart,
      fallbackEnd,
    });

    expect(result).toEqual({ start: '2026-05-01', end: '2026-05-07' });
  });

  test('falls back to cookies when URL params are missing', () => {
    const result = resolveDashboardDateRange({
      cookieStart: '2026-04-10',
      cookieEnd: '2026-04-16',
      fallbackStart,
      fallbackEnd,
    });

    expect(result).toEqual({ start: '2026-04-10', end: '2026-04-16' });
  });

  test('falls back to provided defaults when URL and cookies are missing', () => {
    const result = resolveDashboardDateRange({
      fallbackStart: monthStart,
      fallbackEnd: monthEnd,
    });

    expect(result).toEqual({ start: monthStart, end: monthEnd });
  });

  test('ignores partial URL params and uses cookies instead', () => {
    const result = resolveDashboardDateRange({
      urlStart: '2026-05-01',
      cookieStart: '2026-04-10',
      cookieEnd: '2026-04-16',
      fallbackStart,
      fallbackEnd,
    });

    expect(result).toEqual({ start: '2026-04-10', end: '2026-04-16' });
  });
});

describe('dashboard date cookie keys', () => {
  test('exports stable weekly and roster cookie names', () => {
    expect(DASHBOARD_WEEKLY_START_COOKIE).toBe('dashboard_start_date');
    expect(DASHBOARD_WEEKLY_END_COOKIE).toBe('dashboard_end_date');
    expect(DASHBOARD_ROSTER_START_COOKIE).toBe('dashboard_roster_start_date');
    expect(DASHBOARD_ROSTER_END_COOKIE).toBe('dashboard_roster_end_date');
  });
});
