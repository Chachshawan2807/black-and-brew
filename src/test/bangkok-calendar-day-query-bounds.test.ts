import { describe, expect, test } from 'vitest';
import { getBangkokCalendarDayQueryBounds } from '@/lib/date-utils';

describe('getBangkokCalendarDayQueryBounds', () => {
  test('uses explicit +07:00 bounds for Bangkok calendar days', () => {
    expect(getBangkokCalendarDayQueryBounds('2026-09-13')).toEqual({
      startInclusive: '2026-09-13T00:00:00+07:00',
      endInclusive: '2026-09-13T23:59:59.999+07:00',
    });
  });
});
