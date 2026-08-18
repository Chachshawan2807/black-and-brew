import { expect, test, describe } from 'vitest';
import { startOfWeek, addDays, format } from 'date-fns';
import {
  persistDashboardWeeklyRange,
  resolveDashboardDateRange,
} from '@/lib/dashboard-date-range';

describe('Dashboard Date Persistence with Cookies', () => {
  test('should persist weekly dates to cookies and localStorage', () => {
    localStorage.clear();
    document.cookie = 'dashboard_start_date=; max-age=0; path=/';
    document.cookie = 'dashboard_end_date=; max-age=0; path=/';

    const start = '2026-05-10';
    const end = '2026-05-16';

    persistDashboardWeeklyRange(start, end);

    expect(document.cookie).toContain('dashboard_start_date=2026-05-10');
    expect(document.cookie).toContain('dashboard_end_date=2026-05-16');
    expect(localStorage.getItem('bb-dashboard-weekly-start-date')).toBe(start);
    expect(localStorage.getItem('bb-dashboard-weekly-end-date')).toBe(end);
  });

  test('should resolve fallback dates in correct order: URL > Cookie > Monday', () => {
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
    const sunday = addDays(monday, 6);
    const formattedMonday = format(monday, 'yyyy-MM-dd');
    const formattedSunday = format(sunday, 'yyyy-MM-dd');

    const urlStart = '2026-05-01';
    const urlEnd = '2026-05-07';
    const cookieStart = '2026-04-10';
    const cookieEnd = '2026-04-16';

    const res1 = resolveDashboardDateRange({
      urlStart,
      urlEnd,
      cookieStart,
      cookieEnd,
      fallbackStart: formattedMonday,
      fallbackEnd: formattedSunday,
    });
    expect(res1.start).toBe('2026-05-01');
    expect(res1.end).toBe('2026-05-07');

    const res2 = resolveDashboardDateRange({
      cookieStart,
      cookieEnd,
      fallbackStart: formattedMonday,
      fallbackEnd: formattedSunday,
    });
    expect(res2.start).toBe('2026-04-10');
    expect(res2.end).toBe('2026-04-16');

    const res3 = resolveDashboardDateRange({
      fallbackStart: formattedMonday,
      fallbackEnd: formattedSunday,
    });
    expect(res3.start).toBe(formattedMonday);
    expect(res3.end).toBe(formattedSunday);
  });
});
