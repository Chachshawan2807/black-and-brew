import type { DailyReportData, StaffShiftEntry } from '@/lib/daily-report';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import { formatScheduleNotificationDateDisplay } from '@/lib/date-utils';

/** Include nearby public holidays in daily report summaries only within this many days. */
export const HOLIDAY_SUMMARY_MAX_DAYS = 14;

const LEAVE_SHIFT_TEXT = 'ลา';
const DAY_OFF_SHIFT_TEXT = 'วันหยุด';

/** Leave-only staff for schedule notifications empty/day-off shifts are omitted. */
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
  const dateLabel = formatScheduleNotificationDateDisplay(data.dateStr);
  const lines: string[] = [
    `ตารางงาน ${dateLabel} (${scheduleLabel(data.schedule)}) · เข้างาน ${data.headcount} คน`,
  ];

  if (data.activeStaff.length > 0) {
    lines.push(data.activeStaff.map((s) => `${s.name} ${s.shiftText}`).join(', '));
  }

  if (data.otherDutyStaff.length > 0) {
    const otherDutySummary = data.otherDutyStaff
      .map((s) => `${s.name} ${s.shiftText}`)
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

export function buildDailyReportFieldSummary(data: DailyReportData): string {
  return buildDailyReportNotificationLines(data).join('\n');
}

export function buildDailyReportAltText(data: DailyReportData): string {
  return truncate(buildDailyReportFieldSummary(data), 400);
}

export function buildDailyReportSummaryLine(data: DailyReportData): string {
  return buildDailyReportNotificationLines(data)[0] ?? '';
}

function isStaffShiftEntry(value: unknown): value is StaffShiftEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as StaffShiftEntry).name === 'string' &&
    typeof (value as StaffShiftEntry).shiftText === 'string'
  );
}

function isStaffShiftEntryArray(value: unknown): value is StaffShiftEntry[] {
  return Array.isArray(value) && value.every(isStaffShiftEntry);
}

/** Parse stored daily report snapshot from data_change_logs.new_value. */
export function parseDailyReportSnapshot(value: unknown): DailyReportData | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const snapshot = value as Record<string, unknown>;
  if (snapshot.schedule !== 'today' && snapshot.schedule !== 'tomorrow') return null;
  if (typeof snapshot.dateStr !== 'string') return null;
  if (!isStaffShiftEntryArray(snapshot.activeStaff)) return null;
  if (!isStaffShiftEntryArray(snapshot.otherDutyStaff)) return null;
  if (!isStaffShiftEntryArray(snapshot.offStaff)) return null;
  if (typeof snapshot.headcount !== 'number') return null;

  const holiday = snapshot.holiday;
  const parsedHoliday =
    holiday === null
      ? null
      : typeof holiday === 'object' &&
          holiday !== null &&
          typeof (holiday as { name?: unknown }).name === 'string' &&
          typeof (holiday as { daysRemaining?: unknown }).daysRemaining === 'number'
        ? {
            name: (holiday as { name: string }).name,
            daysRemaining: (holiday as { daysRemaining: number }).daysRemaining,
          }
        : null;

  return {
    schedule: snapshot.schedule,
    dateStr: snapshot.dateStr,
    activeStaff: snapshot.activeStaff,
    otherDutyStaff: snapshot.otherDutyStaff,
    offStaff: snapshot.offStaff,
    headcount: snapshot.headcount,
    holiday: parsedHoliday,
  };
}

export function formatDailyReportHistoryHeadline(
  row: Pick<DataChangeLogRow, 'entity_label' | 'metadata' | 'new_value'>,
  isTh: boolean,
): string {
  const meta = row.metadata ?? {};
  const title = typeof meta.title === 'string' ? meta.title.trim() : '';
  if (title) return title;

  const snapshot = parseDailyReportSnapshot(row.new_value);
  if (snapshot) {
    const dateLabel = formatScheduleNotificationDateDisplay(snapshot.dateStr);
    const scheduleLabel = snapshot.schedule === 'tomorrow'
      ? isTh ? 'พรุ่งนี้' : 'tomorrow'
      : isTh ? 'วันนี้' : 'today';
    return isTh
      ? `ตารางงาน ${dateLabel} (${scheduleLabel})`
      : `Schedule ${dateLabel} (${scheduleLabel})`;
  }

  const entityLabel = row.entity_label?.trim();
  if (entityLabel) {
    return isTh ? `ตารางงาน ${entityLabel}` : `Schedule ${entityLabel}`;
  }

  return isTh ? 'ตารางงาน' : 'Schedule';
}

export function formatDailyReportHistoryDetailLines(
  row: Pick<DataChangeLogRow, 'entity_type' | 'metadata' | 'new_value'>,
  isTh: boolean,
): string[] | null {
  if (row.entity_type !== 'daily_report') return null;

  const snapshot = parseDailyReportSnapshot(row.new_value);
  if (snapshot) {
    return buildDailyReportNotificationLines(snapshot);
  }

  const fieldSummary = row.metadata?.fieldSummary;
  if (typeof fieldSummary === 'string' && fieldSummary.trim()) {
    return fieldSummary
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  const summary = row.metadata?.summary;
  if (typeof summary === 'string' && summary.trim()) {
    return [summary.trim()];
  }

  return [isTh ? 'อัปเดตตารางงาน' : 'Schedule updated'];
}
