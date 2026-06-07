import { addDays, format, nextDay, previousDay, subDays, type Day } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { parseExplicitScheduleDate } from '@/lib/schedule/parse-schedule-date';

const THAI_WEEKDAY_PATTERNS: Array<{ pattern: RegExp; day: Day }> = [
  { pattern: /อาทิตย์/i, day: 0 },
  { pattern: /จันทร์/i, day: 1 },
  { pattern: /อังคาร/i, day: 2 },
  { pattern: /พุธ/i, day: 3 },
  { pattern: /พฤหัสบดี/i, day: 4 },
  { pattern: /ศุกร์/i, day: 5 },
  { pattern: /เสาร์/i, day: 6 },
];

const UPCOMING_WEEKDAY_PATTERN = /ที่จะถึง|ถัดไป|หน้า|ต่อไป/i;
const PAST_WEEKDAY_PATTERN = /ที่แล้ว|ที่ผ่านมา|ก่อน/i;

const RANGE_QUERY_PATTERN = /สัปดาห์|เดือน|ช่วง|รายสัปดาห์|ทั้งเดือน/i;
const DAILY_SCHEDULE_PATTERN =
  /ตารางงาน|กะงาน|กะวัน|เข้ากะ|schedule|shift|ใครทำงาน|ใครเข้า|ใครออก/i;
const STAFF_DAILY_PATTERN =
  /(พนักงาน|สต้าฟ|staff).*(วันนี้|พรุ่งนี้|เมื่อวาน|ทุกคน|ทั้งหมด|ใคร)/i;

export function isDailyScheduleQuery(text: string): boolean {
  if (RANGE_QUERY_PATTERN.test(text)) return false;

  return (
    DAILY_SCHEDULE_PATTERN.test(text) ||
    STAFF_DAILY_PATTERN.test(text) ||
    /(วันนี้|พรุ่งนี้|เมื่อวาน).*(ตารางงาน|กะงาน|กะ)/i.test(text)
  );
}

function detectThaiWeekday(text: string): Day | null {
  for (const { pattern, day } of THAI_WEEKDAY_PATTERNS) {
    if (pattern.test(text)) return day;
  }
  return null;
}

function resolveWeekdayTargetDate(text: string, baseDate: Date): string | null {
  const targetDay = detectThaiWeekday(text);
  if (targetDay === null) return null;

  if (PAST_WEEKDAY_PATTERN.test(text) && !UPCOMING_WEEKDAY_PATTERN.test(text)) {
    return format(previousDay(baseDate, targetDay), 'yyyy-MM-dd');
  }

  if (UPCOMING_WEEKDAY_PATTERN.test(text)) {
    return format(nextDay(baseDate, targetDay), 'yyyy-MM-dd');
  }

  if (/นี้/i.test(text) && baseDate.getDay() === targetDay) {
    return format(baseDate, 'yyyy-MM-dd');
  }

  if (baseDate.getDay() === targetDay) {
    return format(baseDate, 'yyyy-MM-dd');
  }

  return format(nextDay(baseDate, targetDay), 'yyyy-MM-dd');
}

export function resolveScheduleTargetDate(text: string, currentIsoDate: string): string {
  const baseDate = toZonedTime(new Date(`${currentIsoDate}T12:00:00`), 'Asia/Bangkok');

  if (/พรุ่งนี้/i.test(text)) {
    return format(addDays(baseDate, 1), 'yyyy-MM-dd');
  }

  if (/เมื่อวาน/i.test(text)) {
    return format(subDays(baseDate, 1), 'yyyy-MM-dd');
  }

  const explicitDate = parseExplicitScheduleDate(text, currentIsoDate);
  if (explicitDate) return explicitDate;

  const weekdayDate = resolveWeekdayTargetDate(text, baseDate);
  if (weekdayDate) return weekdayDate;

  return currentIsoDate;
}
