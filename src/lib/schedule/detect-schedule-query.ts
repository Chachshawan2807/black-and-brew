import { addDays, format, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

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

export function resolveScheduleTargetDate(text: string, currentIsoDate: string): string {
  const baseDate = toZonedTime(new Date(`${currentIsoDate}T12:00:00`), 'Asia/Bangkok');

  if (/พรุ่งนี้/i.test(text)) {
    return format(addDays(baseDate, 1), 'yyyy-MM-dd');
  }

  if (/เมื่อวาน/i.test(text)) {
    return format(subDays(baseDate, 1), 'yyyy-MM-dd');
  }

  return currentIsoDate;
}
