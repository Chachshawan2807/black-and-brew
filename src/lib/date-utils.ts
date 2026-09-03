import { addDays, format, parse, parseISO } from 'date-fns';
import { fromZonedTime, toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { THAI_TIMEZONE } from './timezone';

const THAI_DAY_ABBREVS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'] as const;

/** Thai user-facing calendar date format (DD/MM/YYYY). */
export const THAI_DISPLAY_DATE_FORMAT = 'dd/MM/yyyy';

type CalendarParts = { y: number; m: number; d: number };

function parseCalendarParts(input: Date | string): CalendarParts | null {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    const ddMmYyyySlash = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
    if (ddMmYyyySlash) {
      return {
        d: Number(ddMmYyyySlash[1]),
        m: Number(ddMmYyyySlash[2]),
        y: Number(ddMmYyyySlash[3]),
      };
    }

    const ddMmYyyyDash = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
    if (ddMmYyyyDash) {
      return {
        d: Number(ddMmYyyyDash[1]),
        m: Number(ddMmYyyyDash[2]),
        y: Number(ddMmYyyyDash[3]),
      };
    }

    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (isoMatch) {
      return {
        y: Number(isoMatch[1]),
        m: Number(isoMatch[2]),
        d: Number(isoMatch[3]),
      };
    }

    const parsedSlash = parse(trimmed, THAI_DISPLAY_DATE_FORMAT, new Date());
    if (!Number.isNaN(parsedSlash.getTime())) {
      return {
        y: parsedSlash.getFullYear(),
        m: parsedSlash.getMonth() + 1,
        d: parsedSlash.getDate(),
      };
    }

    const parsed = parse(trimmed, 'dd-MM-yyyy', new Date());
    if (Number.isNaN(parsed.getTime())) return null;
    return {
      y: parsed.getFullYear(),
      m: parsed.getMonth() + 1,
      d: parsed.getDate(),
    };
  }

  return {
    y: Number(formatInTimeZone(input, THAI_TIMEZONE, 'yyyy')),
    m: Number(formatInTimeZone(input, THAI_TIMEZONE, 'MM')),
    d: Number(formatInTimeZone(input, THAI_TIMEZONE, 'dd')),
  };
}

function formatCalendarPartsThai({ y, m, d }: CalendarParts): string {
  const datePart = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  const dayAbbrev = THAI_DAY_ABBREVS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${datePart} ${dayAbbrev}`;
}

/** Calendar date yyyy-MM-dd in Asia/Bangkok for the given instant. */
export function getBangkokCalendarIso(now = new Date()): string {
  return formatInTimeZone(now, THAI_TIMEZONE, 'yyyy-MM-dd');
}

/** Shift a Bangkok calendar date by N days (returns yyyy-MM-dd). */
export function addBangkokCalendarDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const anchor = fromZonedTime(new Date(y, m - 1, d, 12, 0, 0), THAI_TIMEZONE);
  return formatInTimeZone(addDays(anchor, days), THAI_TIMEZONE, 'yyyy-MM-dd');
}

/** Anchor Date at noon Bangkok for shift DB queries on a calendar day. */
export function bangkokCalendarIsoToDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return fromZonedTime(new Date(y, m - 1, d, 12, 0, 0), THAI_TIMEZONE);
}

export function bangkokIsoToThaiDisplay(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

/** DD/MM/YYYY with abbreviated Thai weekday (e.g. "21/08/2026 ศ."). */
export function formatScheduleNotificationDateDisplay(input: Date | string): string {
  const parts = parseCalendarParts(input);
  if (!parts) return typeof input === 'string' ? input.trim() : '';
  return formatCalendarPartsThai(parts);
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
