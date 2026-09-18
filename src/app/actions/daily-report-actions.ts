'use server';

import { requireReadAccess } from '@/lib/policies/server-gate';
import {
  compileDailyReportData as compileDailyReportDataLib,
  compileDailyReportDataForDate as compileDailyReportDataForDateLib,
  fetchNextHoliday as fetchNextHolidayLib,
  fetchTodayShifts as fetchTodayShiftsLib,
  type DailyReportData,
  type DailyReportSchedule,
  type StaffShiftEntry,
} from '@/lib/daily-report';

export type { DailyReportData, DailyReportSchedule, StaffShiftEntry };

const EMPTY_SHIFTS = {
  activeStaff: [] as StaffShiftEntry[],
  otherDutyStaff: [] as StaffShiftEntry[],
  offStaff: [] as StaffShiftEntry[],
  headcount: 0,
};

export async function fetchTodayShifts(targetDate: Date) {
  const authError = await requireReadAccess();
  if (authError) {
    return EMPTY_SHIFTS;
  }
  return fetchTodayShiftsLib(targetDate);
}

export async function fetchNextHoliday(targetDate: Date) {
  const authError = await requireReadAccess();
  if (authError) {
    return { ok: false, error: { message: authError, details: null } };
  }
  return fetchNextHolidayLib(targetDate);
}

export async function compileDailyReportDataForDate(
  targetDate: Date,
  schedule: DailyReportSchedule,
): Promise<DailyReportData> {
  const authError = await requireReadAccess();
  if (authError) {
    const dateStr = targetDate.toISOString();
    return {
      schedule,
      dateStr,
      ...EMPTY_SHIFTS,
      holiday: null,
    };
  }
  return compileDailyReportDataForDateLib(targetDate, schedule);
}

export async function compileDailyReportData(
  schedule: DailyReportSchedule = 'today',
  now: Date = new Date(),
): Promise<DailyReportData> {
  const authError = await requireReadAccess();
  if (authError) {
    return {
      schedule,
      dateStr: '',
      ...EMPTY_SHIFTS,
      holiday: null,
    };
  }
  return compileDailyReportDataLib(schedule, now);
}
