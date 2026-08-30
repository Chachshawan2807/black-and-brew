import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import type { WeeklyDaySchedule } from '@/lib/proactive-insights/types';
import { INSIGHT_THRESHOLDS } from '@/lib/proactive-insights/thresholds';

/** Short Thai weekday labels index 0 = Monday … 6 = Sunday. */
export const THAI_DAY_LABELS = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'] as const;

export type WeeklyLeaveEntry = {
  name: string;
  dateIso: string;
  dayIndex: number;
};

/** Monday (0) through Sunday (6) date ISO strings for the week containing anchorDateIso. */
export function getWeekDateIsos(anchorDateIso: string): string[] {
  const anchor = parseISO(anchorDateIso);
  const monday = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => format(addDays(monday, i), 'yyyy-MM-dd'));
}

export function isDayUnderstaffed(day: Pick<WeeklyDaySchedule, 'dayIndex' | 'headcount' | 'isPublicHoliday'>): boolean {
  if (day.isPublicHoliday) {
    return day.headcount <= INSIGHT_THRESHOLDS.publicHolidayHeadcountLimit;
  }
  const limit = INSIGHT_THRESHOLDS.weeklyHeadcountLimits[day.dayIndex];
  return day.headcount <= limit;
}

export function findUnderstaffedDays(days: WeeklyDaySchedule[]): WeeklyDaySchedule[] {
  return days.filter((day) => isDayUnderstaffed(day));
}

export function sumWeeklyLeave(days: WeeklyDaySchedule[]): number {
  return days.reduce((sum, day) => sum + day.leaveCount, 0);
}

export function collectWeeklyLeaveEntries(days: WeeklyDaySchedule[]): WeeklyLeaveEntry[] {
  const entries: WeeklyLeaveEntry[] = [];
  for (const day of days) {
    for (const staff of day.leaveStaff) {
      entries.push({
        name: staff.name,
        dateIso: day.dateIso,
        dayIndex: day.dayIndex,
      });
    }
  }
  return entries;
}

/** Keep leave entries on or after fromDateIso past leave days are omitted from alerts. */
export function filterUpcomingLeaveEntries(
  entries: WeeklyLeaveEntry[],
  fromDateIso: string,
): WeeklyLeaveEntry[] {
  return entries.filter((entry) => entry.dateIso >= fromDateIso);
}
