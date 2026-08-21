import { format, parse, parseISO } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { THAI_TIMEZONE } from './timezone';

const THAI_DAY_ABBREVS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'] as const;

/** DD-MM-YYYY with abbreviated Thai weekday (e.g. "21-08-2026 ศ."). */
export function formatScheduleNotificationDateDisplay(input: Date | string): string {
  let zoned: Date;

  if (typeof input === 'string') {
    const trimmed = input.trim();
    const ddMmYyyy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
    if (ddMmYyyy) {
      const [, dd, mm, yyyy] = ddMmYyyy;
      zoned = toZonedTime(new Date(`${yyyy}-${mm}-${dd}T12:00:00`), THAI_TIMEZONE);
    } else {
      const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
      if (isoMatch) {
        zoned = toZonedTime(new Date(`${isoMatch[0]}T12:00:00`), THAI_TIMEZONE);
      } else {
        const parsed = parse(trimmed, 'dd-MM-yyyy', new Date());
        if (Number.isNaN(parsed.getTime())) return trimmed;
        zoned = toZonedTime(parsed, THAI_TIMEZONE);
      }
    }
  } else {
    zoned = toZonedTime(input, THAI_TIMEZONE);
  }

  const datePart = formatInTimeZone(zoned, THAI_TIMEZONE, 'dd-MM-yyyy');
  const dayAbbrev = THAI_DAY_ABBREVS[zoned.getDay()];
  return `${datePart} ${dayAbbrev}`;
}

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
