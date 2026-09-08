import { describe, expect, test } from 'vitest';
import { fromZonedTime } from 'date-fns-tz';
import { THAI_TIMEZONE } from '@/lib/timezone';
import {
  INSIGHT_CRON_SCHEDULES,
  INSIGHT_CRON_TOLERANCE_MINUTES,
  isWithinInsightCronWindow,
  parseInsightAlertWindow,
} from '@/lib/proactive-insights/insight-schedule';

function bangkokInstant(hour: number, minute: number, dateIso = '2026-09-08'): Date {
  return fromZonedTime(`${dateIso}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`, THAI_TIMEZONE);
}

describe('insight-schedule', () => {
  test('parseInsightAlertWindow defaults to morning', () => {
    expect(parseInsightAlertWindow(null)).toBe('morning');
    expect(parseInsightAlertWindow('morning')).toBe('morning');
    expect(parseInsightAlertWindow('evening')).toBe('evening');
    expect(parseInsightAlertWindow('invalid')).toBe('morning');
  });

  test('isWithinInsightCronWindow accepts morning at 07:00 ICT', () => {
    const atSeven = bangkokInstant(7, 0);
    expect(isWithinInsightCronWindow('morning', atSeven)).toBe(true);
    expect(INSIGHT_CRON_SCHEDULES.morning).toEqual({ hour: 7, minute: 0 });
  });

  test('isWithinInsightCronWindow rejects morning at 07:19 ICT', () => {
    const atSevenNineteen = bangkokInstant(7, 19);
    expect(isWithinInsightCronWindow('morning', atSevenNineteen)).toBe(false);
  });

  test('isWithinInsightCronWindow allows tolerance around scheduled minute', () => {
    const atSevenFive = bangkokInstant(7, 5);
    const atSixFifty = bangkokInstant(6, 50);
    expect(isWithinInsightCronWindow('morning', atSevenFive)).toBe(true);
    expect(isWithinInsightCronWindow('morning', atSixFifty)).toBe(true);
    expect(INSIGHT_CRON_TOLERANCE_MINUTES).toBe(10);
  });

  test('isWithinInsightCronWindow accepts evening at 17:00 ICT', () => {
    const atFivePm = bangkokInstant(17, 0);
    expect(isWithinInsightCronWindow('evening', atFivePm)).toBe(true);
  });
});
