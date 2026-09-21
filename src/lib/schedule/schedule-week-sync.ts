import { addDays, format, startOfWeek } from 'date-fns';

/** Parse YYYY-MM-DD without UTC midnight shifting the local calendar day. */
export function parseScheduleDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00`);
}

export function getScheduleWeekDays(mondayStr: string): string[] {
  const monday = startOfWeek(parseScheduleDateOnly(mondayStr), { weekStartsOn: 1 });
  return [...Array(7)].map((_, index) => format(addDays(monday, index), 'yyyy-MM-dd'));
}

export function shiftBelongsToWeek(
  shift: { start_time: string },
  weekStart: string,
  weekEnd: string,
): boolean {
  const date = shift.start_time.split('T')[0];
  return date >= weekStart && date <= weekEnd;
}

export function weekHasShiftData<T extends { start_time: string }>(
  shifts: T[],
  weekStart: string,
  weekEnd: string,
): boolean {
  return shifts.some((shift) => shiftBelongsToWeek(shift, weekStart, weekEnd));
}

/** Keep existing schedule query flags (e.g. showRegularHolidays) when changing weeks. */
export function buildScheduleWeekSearch(currentSearch: string, dateInput: string): string {
  const raw = currentSearch.startsWith('?') ? currentSearch.slice(1) : currentSearch;
  const params = new URLSearchParams(raw);
  params.set('week', dateInput);
  return `?${params.toString()}`;
}
