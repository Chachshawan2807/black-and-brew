import { describe, expect, test } from 'vitest';
import { formatScheduleNotificationDateDisplay } from '@/lib/date-utils';

describe('formatScheduleNotificationDateDisplay', () => {
  test('appends abbreviated Thai weekday after DD/MM/YYYY date strings', () => {
    expect(formatScheduleNotificationDateDisplay('21/08/2026')).toBe('21/08/2026 ศ.');
    expect(formatScheduleNotificationDateDisplay('13/06/2026')).toBe('13/06/2026 ส.');
  });

  test('still accepts legacy DD-MM-YYYY date strings', () => {
    expect(formatScheduleNotificationDateDisplay('21-08-2026')).toBe('21/08/2026 ศ.');
  });

  test('accepts ISO calendar dates', () => {
    expect(formatScheduleNotificationDateDisplay('2026-08-21')).toBe('21/08/2026 ศ.');
    expect(formatScheduleNotificationDateDisplay('2026-06-07')).toBe('07/06/2026 อา.');
  });

  test('accepts Date objects in Bangkok timezone', () => {
    const date = new Date('2026-08-21T12:00:00+07:00');
    expect(formatScheduleNotificationDateDisplay(date)).toBe('21/08/2026 ศ.');
  });

  test('keeps calendar date stable on UTC servers (Vercel)', () => {
    const previousTz = process.env.TZ;
    process.env.TZ = 'UTC';
    try {
      expect(formatScheduleNotificationDateDisplay('26/08/2026')).toBe('26/08/2026 พ.');
      expect(formatScheduleNotificationDateDisplay('21/08/2026')).toBe('21/08/2026 ศ.');
    } finally {
      if (previousTz === undefined) delete process.env.TZ;
      else process.env.TZ = previousTz;
    }
  });
});
