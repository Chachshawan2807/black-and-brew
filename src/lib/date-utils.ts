import { format, parseISO } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { THAI_TIMEZONE } from './timezone';

export function formatToThai(date: Date | string, formatStr: string) {
  return formatInTimeZone(date, THAI_TIMEZONE, formatStr);
}

export function isSameThaiDay(date1: Date | string, date2: Date | string) {
  const getLocalDateStr = (d: Date | string) => {
    if (typeof d === 'string') {
      const match = d.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) return match[0];
    }
    const dObj = typeof d === 'string' ? parseISO(d) : d;
    return format(toZonedTime(dObj, THAI_TIMEZONE), 'yyyy-MM-dd');
  };
  return getLocalDateStr(date1) === getLocalDateStr(date2);
}
