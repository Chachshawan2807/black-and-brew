import { describe, expect, test } from 'vitest';
import { todayIsoBkk } from '@/lib/secretary/today-iso-bkk';
import { msUntilNextBangkokMidnight } from '@/lib/secretary/watch-bangkok-work-date';

describe('secretary date sync', () => {
  test('todayIsoBkk uses Asia/Bangkok calendar date', () => {
    const noonUtcAug28 = new Date('2026-08-28T05:00:00.000Z');
    expect(todayIsoBkk(noonUtcAug28)).toBe('2026-08-28');

    const justAfterMidnightBkkAug29 = new Date('2026-08-28T17:05:00.000Z');
    expect(todayIsoBkk(justAfterMidnightBkkAug29)).toBe('2026-08-29');
  });

  test('msUntilNextBangkokMidnight is positive and under 24h', () => {
    const ms = msUntilNextBangkokMidnight(new Date('2026-08-28T10:00:00.000Z'));
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  });
});
