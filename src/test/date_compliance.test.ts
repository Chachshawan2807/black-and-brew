import { describe, it, expect } from 'vitest';
import { isSameThaiDay } from '../lib/date-utils';

describe('Date Compliance & Alignment Checks', () => {
  it('should evaluate date equality correctly regardless of timezone offset shifts', () => {
    // 1. UTC Timestamp
    const utcTimestamp = '2026-05-18T00:00:00+00:00';
    // 2. ISO timestamp without offset (optimistic UI local format)
    const localTimestamp = '2026-05-18T00:00:00';
    // 3. Date string
    const dateStr = '2026-05-18';

    expect(isSameThaiDay(utcTimestamp, dateStr)).toBe(true);
    expect(isSameThaiDay(localTimestamp, dateStr)).toBe(true);
    expect(isSameThaiDay(localTimestamp, utcTimestamp)).toBe(true);
  });

  it('should evaluate different dates as unequal', () => {
    const d1 = '2026-05-18T00:00:00+00:00';
    const d2 = '2026-05-19T00:00:00+00:00';
    expect(isSameThaiDay(d1, d2)).toBe(false);
  });
});
