import { describe, expect, test } from 'vitest';
import { buildWeekScheduleFromRange } from '@/lib/proactive-insights/build-week-schedule';
import { getWeekDateIsos } from '@/lib/proactive-insights/week-schedule';

describe('buildWeekScheduleFromRange', () => {
  test('groups a week of shifts in memory with the same leave and headcount as a per-day roster', () => {
    const weekIsos = getWeekDateIsos('2026-07-22');
    const profiles = [
      { id: 'p1', full_name: 'นิต้า', schedule_order: 1 },
      { id: 'p2', full_name: 'มุก', schedule_order: 2 },
      { id: 'p3', full_name: 'โบ๊ท', schedule_order: 3 },
    ];
    const shifts = [
      {
        employee_id: 'p1',
        status: 'active',
        metadata: { location: '6:30' },
        start_time: '2026-07-20T00:30:00+07:00',
      },
      {
        employee_id: 'p2',
        status: 'on_leave',
        metadata: { location: 'ลา' },
        start_time: '2026-07-20T08:00:00+07:00',
      },
      {
        employee_id: 'p1',
        status: 'active',
        metadata: { location: '8:00' },
        start_time: '2026-07-22T01:00:00+07:00',
      },
      {
        employee_id: 'p3',
        status: 'active',
        metadata: { location: 'ร้านซักผ้า' },
        start_time: '2026-07-22T09:00:00+07:00',
      },
    ];

    const days = buildWeekScheduleFromRange({
      weekIsos,
      holidayDates: new Set(['2026-07-22']),
      profiles,
      shifts,
    });

    expect(days).toHaveLength(7);
    expect(days.map((day) => day.dateIso)).toEqual(weekIsos);

    const monday = days[0];
    expect(monday?.headcount).toBe(1);
    expect(monday?.leaveCount).toBe(1);
    expect(monday?.leaveStaff).toEqual([{ name: 'มุก' }]);
    expect(monday?.isPublicHoliday).toBe(false);

    const tuesday = days[1];
    expect(tuesday?.headcount).toBe(0);
    expect(tuesday?.leaveCount).toBe(0);
    expect(tuesday?.leaveStaff).toEqual([]);

    const wednesday = days[2];
    expect(wednesday?.dateIso).toBe('2026-07-22');
    expect(wednesday?.headcount).toBe(1);
    expect(wednesday?.leaveCount).toBe(0);
    expect(wednesday?.isPublicHoliday).toBe(true);
  });
});
