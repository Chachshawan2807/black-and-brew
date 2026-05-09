import { formatInTimeZone, toDate } from 'date-fns-tz';

export const THAI_TIMEZONE = 'Asia/Bangkok';

/**
 * Converts a UTC date to a formatted Thai time string.
 */
export function formatToThaiTime(date: Date | string | number, formatStr: string = 'yyyy-MM-dd HH:mm:ssXXX') {
  return formatInTimeZone(date, THAI_TIMEZONE, formatStr);
}

/**
 * Converts a date to a Thai timezone Date object.
 */
export function toThaiDate(date: Date | string | number) {
  return toDate(date, { timeZone: THAI_TIMEZONE });
}

/**
 * Gets the current time in Thai timezone.
 */
export function nowInThai() {
  return toThaiDate(new Date());
}
