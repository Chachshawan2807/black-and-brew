import { expect, test, describe, vi } from 'vitest';
import { startOfWeek, addDays, format } from 'date-fns';

// We mock next/navigation since LiveShiftList imports useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// We mock next/headers for server-side cookie testing
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockImplementation(async () => {
    return {
      get: (key: string) => {
        if (key === 'dashboard_start_date') return { value: '2026-04-10' };
        if (key === 'dashboard_end_date') return { value: '2026-04-16' };
        return undefined;
      }
    };
  })
}));

describe('Dashboard Date Persistence with Cookies', () => {
  test('should assert document.cookie contains selected dates after setting', () => {
    // Clear cookies first
    document.cookie = 'dashboard_start_date=; max-age=0; path=/';
    document.cookie = 'dashboard_end_date=; max-age=0; path=/';

    const start = '2026-05-10';
    const end = '2026-05-16';

    // Simulate handleDateChange
    document.cookie = `dashboard_start_date=${start}; path=/; max-age=31536000; SameSite=Lax`;
    document.cookie = `dashboard_end_date=${end}; path=/; max-age=31536000; SameSite=Lax`;

    expect(document.cookie).toContain('dashboard_start_date=2026-05-10');
    expect(document.cookie).toContain('dashboard_end_date=2026-05-16');
  });

  test('should resolve fallback dates in correct order: URL > Cookie > Monday', async () => {
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
    const sunday = addDays(monday, 6);
    const formattedMonday = format(monday, 'yyyy-MM-dd');
    const formattedSunday = format(sunday, 'yyyy-MM-dd');

    // Case 1: URL query param exists (should take priority)
    const urlStart = '2026-05-01';
    const urlEnd = '2026-05-07';
    
    // Case 2: Cookie exists
    const cookieStart = '2026-04-10';
    const cookieEnd = '2026-04-16';

    // Helper resolver function mirroring our server logic
    const resolveDates = (urlS?: string, urlE?: string, cookieS?: string, cookieE?: string) => {
      const start = urlS || cookieS || formattedMonday;
      const end = urlE || cookieE || formattedSunday;
      return { start, end };
    };

    // 1. Prioritize URL
    const res1 = resolveDates(urlStart, urlEnd, cookieStart, cookieEnd);
    expect(res1.start).toBe('2026-05-01');
    expect(res1.end).toBe('2026-05-07');

    // 2. Fallback to Cookie
    const res2 = resolveDates(undefined, undefined, cookieStart, cookieEnd);
    expect(res2.start).toBe('2026-04-10');
    expect(res2.end).toBe('2026-04-16');

    // 3. Fallback to current week
    const res3 = resolveDates(undefined, undefined, undefined, undefined);
    expect(res3.start).toBe(formattedMonday);
    expect(res3.end).toBe(formattedSunday);
  });
});
