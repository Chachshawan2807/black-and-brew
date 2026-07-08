import type { DailyReportData, StaffShiftEntry } from '@/app/actions/daily-report-actions';

/** Include nearby public holidays in daily report summaries only within this many days. */
export const HOLIDAY_SUMMARY_MAX_DAYS = 14;

const LEAVE_SHIFT_TEXT = 'ลา';
const DAY_OFF_SHIFT_TEXT = 'วันหยุด';

/** Leave-only staff for schedule notifications — empty/day-off shifts are omitted. */
export function filterNotificationLeaveStaff(offStaff: StaffShiftEntry[]): StaffShiftEntry[] {
  return offStaff.filter((entry) => entry.shiftText === LEAVE_SHIFT_TEXT);
}

export function isDayOffShiftText(shiftText: string): boolean {
  return shiftText === DAY_OFF_SHIFT_TEXT;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function scheduleLabel(schedule: DailyReportData['schedule']): string {
  return schedule === 'tomorrow' ? 'พรุ่งนี้' : 'วันนี้';
}

export function shouldIncludeHolidaySummary(
  holiday: DailyReportData['holiday'],
): boolean {
  return holiday != null && holiday.daysRemaining <= HOLIDAY_SUMMARY_MAX_DAYS;
}

export function buildDailyReportNotificationLines(data: DailyReportData): string[] {
  const lines: string[] = [
    `ตารางงาน ${data.dateStr} (${scheduleLabel(data.schedule)}) · เข้างาน ${data.headcount} คน`,
  ];

  if (data.activeStaff.length > 0) {
    lines.push(data.activeStaff.map((s) => `${s.name} ${s.shiftText}`).join(', '));
  }

  if (data.otherDutyStaff.length > 0) {
    const otherDutySummary = data.otherDutyStaff
      .map((s) => `${s.name} — ${s.shiftText}`)
      .join(', ');
    lines.push(`งานอื่น: ${otherDutySummary}`);
  }

  const leaveNames = filterNotificationLeaveStaff(data.offStaff).map((s) => s.name);
  if (leaveNames.length > 0) {
    lines.push(`ลา: ${leaveNames.join(', ')}`);
  }

  if (shouldIncludeHolidaySummary(data.holiday)) {
    lines.push(`วันหยุด: ${data.holiday!.name} (อีก ${data.holiday!.daysRemaining} วัน)`);
  }

  return lines;
}

export function buildDailyReportAltText(data: DailyReportData): string {
  return truncate(buildDailyReportNotificationLines(data).join('\n'), 400);
}
