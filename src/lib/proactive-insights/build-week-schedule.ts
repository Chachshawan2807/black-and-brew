import { getBangkokCalendarIso } from '@/lib/date-utils';
import { formatDailyShifts } from '@/lib/schedule/format-daily-shifts';
import type { WeeklyDaySchedule } from '@/lib/proactive-insights/types';

type WeekProfileRow = {
  id: string;
  full_name: string;
  schedule_order: number | null;
};

type WeekShiftRow = {
  employee_id: string | null;
  status?: string | null;
  metadata?: { location?: string | null; remark?: string | null } | null;
  start_time?: string | null;
};

export function buildWeekScheduleFromRange(opts: {
  weekIsos: readonly string[];
  holidayDates: ReadonlySet<string>;
  profiles: readonly WeekProfileRow[];
  shifts: readonly WeekShiftRow[];
}): WeeklyDaySchedule[] {
  const shiftsByDate = new Map<string, WeekShiftRow[]>();
  for (const iso of opts.weekIsos) {
    shiftsByDate.set(iso, []);
  }

  for (const shift of opts.shifts) {
    if (!shift.start_time) continue;
    const dateIso = getBangkokCalendarIso(new Date(shift.start_time));
    const bucket = shiftsByDate.get(dateIso);
    if (bucket) bucket.push(shift);
  }

  const profiles = [...opts.profiles];

  return opts.weekIsos.map((dateIso, dayIndex) => {
    const formatted = formatDailyShifts(profiles, shiftsByDate.get(dateIso) ?? []);
    const leaveStaff = formatted.off_or_leave
      .filter((entry) => entry.shift.trim() === 'ลา')
      .map((entry) => ({ name: entry.name }));

    return {
      dateIso,
      dayIndex,
      headcount: formatted.front_store.length,
      leaveCount: leaveStaff.length,
      leaveStaff,
      isPublicHoliday: opts.holidayDates.has(dateIso),
    };
  });
}
