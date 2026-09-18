import { addDays, format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

/** Calendar date in Asia/Bangkok as yyyy-MM-dd. */
export function addCalendarDaysIsoBkk(dateIso: string, days: number): string {
  const anchor = toZonedTime(parseISO(`${dateIso}T12:00:00+07:00`), 'Asia/Bangkok');
  return format(addDays(anchor, days), 'yyyy-MM-dd');
}
