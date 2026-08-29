import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

type LeaveShiftLike = {
  employee_id?: string | null;
  profile_id?: string | null;
  start_time?: string | null;
  status?: string;
  metadata?: {
    location?: string;
    remark?: string;
    notes?: string;
    is_management?: boolean;
  };
};

export type LeaveDetailEntry = {
  date: string;
  dayLabel: string;
  dateLabel: string;
  remark: string;
};

export function isLeaveShift(shift: Pick<LeaveShiftLike, 'status' | 'metadata'>): boolean {
  const location = shift.metadata?.location?.replace(/^เข้ากะ\s*/, '').trim();
  return shift.status === 'on_leave' || location === 'ลา';
}

export function getLeaveRemark(shift: LeaveShiftLike): string {
  const remark = shift.metadata?.remark?.trim();
  if (remark) return remark;
  const notes = shift.metadata?.notes?.trim();
  if (notes) return notes;
  return '';
}

function resolveEmployeeId(shift: LeaveShiftLike): string | null {
  const employeeId = shift.employee_id ?? shift.profile_id;
  return typeof employeeId === 'string' ? employeeId : null;
}

function isDateInRange(date: string, startDate?: string, endDate?: string): boolean {
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

function shouldPreferLeaveShift(current: LeaveShiftLike, candidate: LeaveShiftLike): boolean {
  const currentRemark = getLeaveRemark(current);
  const candidateRemark = getLeaveRemark(candidate);
  if (!currentRemark && candidateRemark) return true;
  if (candidate.metadata?.is_management && !current.metadata?.is_management) return true;
  return false;
}

export function formatLeaveDetailEntry(date: string, remark: string): LeaveDetailEntry {
  const parsed = parseISO(date);
  return {
    date,
    dayLabel: format(parsed, 'EEE', { locale: th }),
    dateLabel: format(parsed, 'd MMM yyyy', { locale: th }),
    remark,
  };
}

export function collectLeaveEntries(
  shifts: LeaveShiftLike[],
  employeeId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    singleDate?: string;
  },
): LeaveDetailEntry[] {
  const byDate = new Map<string, LeaveShiftLike>();

  for (const shift of shifts) {
    if (!isLeaveShift(shift)) continue;

    const shiftEmployeeId = resolveEmployeeId(shift);
    if (shiftEmployeeId !== employeeId) continue;

    const date = shift.start_time?.split('T')[0];
    if (!date) continue;
    if (options?.singleDate && date !== options.singleDate) continue;
    if (!isDateInRange(date, options?.startDate, options?.endDate)) continue;

    const existing = byDate.get(date);
    if (!existing || shouldPreferLeaveShift(existing, shift)) {
      byDate.set(date, shift);
    }
  }

  return [...byDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, shift]) => formatLeaveDetailEntry(date, getLeaveRemark(shift)));
}

export type HolidayLike = {
  date: string;
  name?: string;
};

export type DashboardStaffStatCounts = {
  workDays: number;
  leaveDays: number;
  publicHolidays: number;
};

export function computeDashboardStaffStatCounts(
  shifts: LeaveShiftLike[],
  employeeId: string,
  holidays: HolidayLike[],
  options?: {
    startDate?: string;
    endDate?: string;
  },
): DashboardStaffStatCounts {
  const holidayDates = new Set(holidays.map((holiday) => holiday.date));
  let workDays = 0;
  let leaveDays = 0;
  let publicHolidays = 0;

  for (const shift of shifts) {
    const shiftEmployeeId = resolveEmployeeId(shift);
    if (shiftEmployeeId !== employeeId) continue;

    const date = shift.start_time?.split('T')[0];
    if (!date || !isDateInRange(date, options?.startDate, options?.endDate)) continue;

    if (shift.status === 'scheduled') {
      workDays++;
      if (holidayDates.has(date)) publicHolidays++;
    } else if (shift.status === 'on_leave') {
      leaveDays++;
    }
  }

  return { workDays, leaveDays, publicHolidays };
}

export function collectPublicHolidayWorkEntries(
  shifts: LeaveShiftLike[],
  employeeId: string,
  holidays: HolidayLike[],
  options?: {
    startDate?: string;
    endDate?: string;
  },
): LeaveDetailEntry[] {
  const holidayByDate = new Map(
    holidays.map((holiday) => [holiday.date, holiday.name?.trim() ?? '']),
  );
  const seenDates = new Set<string>();
  const entries: LeaveDetailEntry[] = [];

  for (const shift of shifts) {
    if (shift.status !== 'scheduled') continue;

    const shiftEmployeeId = resolveEmployeeId(shift);
    if (shiftEmployeeId !== employeeId) continue;

    const date = shift.start_time?.split('T')[0];
    if (!date || !holidayByDate.has(date)) continue;
    if (!isDateInRange(date, options?.startDate, options?.endDate)) continue;
    if (seenDates.has(date)) continue;

    seenDates.add(date);
    entries.push(formatLeaveDetailEntry(date, holidayByDate.get(date) ?? ''));
  }

  return entries.sort((left, right) => left.date.localeCompare(right.date));
}

export function getPublicHolidayEntry(
  date: string,
  holidays: HolidayLike[],
): LeaveDetailEntry | null {
  const holiday = holidays.find((item) => item.date === date);
  if (!holiday) return null;
  return formatLeaveDetailEntry(date, holiday.name?.trim() ?? '');
}

export function createHolidayDateLookup(holidays: HolidayLike[]) {
  return new Map(holidays.map((holiday) => [holiday.date, holiday.name?.trim() ?? '']));
}
