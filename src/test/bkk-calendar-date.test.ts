import { describe, expect, test } from 'vitest';
import { addCalendarDaysIsoBkk } from '@/lib/schedule/bkk-calendar-date';

describe('addCalendarDaysIsoBkk', () => {
  test('adds one calendar day in Bangkok', () => {
    expect(addCalendarDaysIsoBkk('2026-09-18', 1)).toBe('2026-09-19');
  });
});
