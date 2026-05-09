import { startOfWeek, addDays, format, parseISO } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { THAI_TIMEZONE } from './timezone';

export function getWeekDays(monday: Date) {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function getMonday(date: Date) {
  // force start of week to Monday (1)
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function formatToThai(date: Date | string, formatStr: string) {
  return formatInTimeZone(date, THAI_TIMEZONE, formatStr);
}

export function isSameThaiDay(date1: Date | string, date2: Date | string) {
  const d1 = typeof date1 === 'string' ? parseISO(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseISO(date2) : date2;
  
  const z1 = toZonedTime(d1, THAI_TIMEZONE);
  const z2 = toZonedTime(d2, THAI_TIMEZONE);
  
  return format(z1, 'yyyy-MM-dd') === format(z2, 'yyyy-MM-dd');
}
