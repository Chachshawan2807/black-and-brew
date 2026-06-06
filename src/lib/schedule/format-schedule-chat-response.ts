import { format as formatDate } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type { FormattedDailyShifts } from '@/lib/schedule/format-daily-shifts';

export function formatScheduleChatResponse(
  isoDate: string,
  shifts: FormattedDailyShifts,
): string {
  const displayDate = formatDate(
    toZonedTime(new Date(`${isoDate}T12:00:00`), 'Asia/Bangkok'),
    'dd-MM-yyyy',
  );

  const lines: string[] = [`สำหรับตารางงานพนักงานในวันที่ ${displayDate} นะคะ`, ''];

  if (shifts.front_store.length > 0) {
    lines.push(`พนักงานปฏิบัติงานหน้าร้าน (รวม ${shifts.front_store.length} คน)`);
    for (const entry of shifts.front_store) {
      lines.push(`${entry.name} - ${entry.shift}`);
    }
    lines.push('');
  }

  if (shifts.other_duty.length > 0) {
    lines.push('พนักงานปฏิบัติงานส่วนอื่น');
    for (const entry of shifts.other_duty) {
      lines.push(`${entry.name} - ${entry.shift}`);
    }
    lines.push('');
  }

  if (shifts.off_or_leave.length > 0) {
    lines.push('พนักงานที่หยุดพัก/ลา');
    for (const entry of shifts.off_or_leave) {
      lines.push(`${entry.name} - ${entry.shift}`);
    }
  }

  const hasStaff =
    shifts.all_staff.length > 0 ||
    shifts.front_store.length > 0 ||
    shifts.other_duty.length > 0 ||
    shifts.off_or_leave.length > 0;

  if (!hasStaff) {
    return 'ไม่พบข้อมูลพนักงานในระบบค่ะ';
  }

  return lines.join('\n').trim();
}
