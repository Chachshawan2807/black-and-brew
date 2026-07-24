import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import type { WeeklyDaySchedule } from '@/lib/proactive-insights/types';
import { INSIGHT_THRESHOLDS } from '@/lib/proactive-insights/thresholds';

/** Short Thai weekday labels — index 0 = Monday … 6 = Sunday. */
export const THAI_DAY_LABELS = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'] as const;

/** Monday (0) through Sunday (6) date ISO strings for the week containing anchorDateIso. */
export function getWeekDateIsos(anchorDateIso: string): string[] {
  const anchor = parseISO(anchorDateIso);
  const monday = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => format(addDays(monday, i), 'yyyy-MM-dd'));
}

export function isDayUnderstaffed(dayIndex: number, headcount: number): boolean {
  const limit = INSIGHT_THRESHOLDS.weeklyHeadcountLimits[dayIndex];
  return headcount <= limit;
}

export function findUnderstaffedDays(days: WeeklyDaySchedule[]): WeeklyDaySchedule[] {
  return days.filter((day) => isDayUnderstaffed(day.dayIndex, day.headcount));
}

export function sumWeeklyLeave(days: WeeklyDaySchedule[]): number {
  return days.reduce((sum, day) => sum + day.leaveCount, 0);
}
