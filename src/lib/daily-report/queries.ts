import { differenceInDays, startOfDay } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import {
  bangkokCalendarIsoToDate,
  getBangkokCalendarDayQueryBounds,
  THAI_DISPLAY_DATE_FORMAT,
} from '@/lib/date-utils';
import type { DailyReportData, DailyReportSchedule, StaffShiftEntry } from '@/lib/daily-report/types';
import { resolveDailyReportTargetIso } from '@/lib/daily-report/schedule';
import { formatDailyShifts } from '@/lib/schedule/format-daily-shifts';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { THAI_TIMEZONE } from '@/lib/timezone';

/** Thai display format for report header (DD/MM/YYYY). */
const THAI_REPORT_DATE_FORMAT = THAI_DISPLAY_DATE_FORMAT;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getErrorDetails(error: unknown): unknown {
  return error && typeof error === 'object' && 'details' in error
    ? (error as { details?: unknown }).details
    : null;
}

/**
 * SPEC: Staff Shift Chronological Sorting
 *
 * Uses the same `formatDailyShifts` pipeline as the schedule page so
 * notification summaries always match the roster UI.
 */
export async function fetchTodayShifts(targetDate: Date) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const dateStr = formatInTimeZone(targetDate, THAI_TIMEZONE, 'yyyy-MM-dd');
    const { startInclusive, endInclusive } = getBangkokCalendarDayQueryBounds(dateStr);

    const [profilesRes, shiftsRes] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id, full_name, schedule_order')
        .order('schedule_order', { ascending: true }),
      supabaseAdmin
        .from('shifts')
        .select('id, employee_id, status, metadata')
        .gte('start_time', startInclusive)
        .lte('start_time', endInclusive),
    ]);

    if (profilesRes.error) {
      console.error(
        '[fetchTodayShifts] Profiles error:',
        profilesRes.error.message,
        profilesRes.error.details,
      );
      throw profilesRes.error;
    }
    if (shiftsRes.error) {
      console.error(
        '[fetchTodayShifts] Shifts error:',
        shiftsRes.error.message,
        shiftsRes.error.details,
      );
      throw shiftsRes.error;
    }

    const formatted = formatDailyShifts(profilesRes.data ?? [], shiftsRes.data ?? []);

    const activeStaff: StaffShiftEntry[] = formatted.front_store.map((entry) => ({
      name: entry.name,
      shiftText: entry.shift,
    }));
    const otherDutyStaff: StaffShiftEntry[] = formatted.other_duty.map((entry) => ({
      name: entry.name,
      shiftText: entry.shift,
      remark: entry.remark,
    }));
    const offStaff: StaffShiftEntry[] = formatted.off_or_leave.map((entry) => ({
      name: entry.name,
      shiftText: entry.shift,
    }));
    const headcount = activeStaff.length;

    return { activeStaff, otherDutyStaff, offStaff, headcount };
  } catch (error) {
    console.error('[fetchTodayShifts] Error:', error);
    return { activeStaff: [], otherDutyStaff: [], offStaff: [], headcount: 0 };
  }
}

/**
 * SPEC: Proactive Holiday Threshold Rule
 *
 * Fetches next upcoming Thai national public holiday and calculates countdown.
 */
export async function fetchNextHoliday(targetDate: Date) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const dateStr = formatInTimeZone(targetDate, THAI_TIMEZONE, 'yyyy-MM-dd');

    const { data, error } = await supabaseAdmin
      .from('holidays')
      .select('name, date')
      .gte('date', dateStr)
      .order('date', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      return { ok: false, error: { message: error.message, details: error.details ?? null } };
    }

    if (!data) return null;

    const holidayDate = startOfDay(new Date(data.date));
    const targetMidnight = startOfDay(targetDate);
    const diff = differenceInDays(holidayDate, targetMidnight);
    return { ok: true, name: data.name, daysRemaining: diff };
  } catch (error) {
    console.error('[fetchNextHoliday] Error:', error);
    return {
      ok: false,
      error: { message: getErrorMessage(error), details: getErrorDetails(error) },
    };
  }
}

/**
 * Compiles shift + holiday data for a specific calendar day.
 * Used by CRON, notification refresh, and authenticated server actions.
 */
export async function compileDailyReportDataForDate(
  targetDate: Date,
  schedule: DailyReportSchedule,
): Promise<DailyReportData> {
  const dateStr = formatInTimeZone(targetDate, THAI_TIMEZONE, THAI_REPORT_DATE_FORMAT);

  const [{ activeStaff, otherDutyStaff, offStaff, headcount }, holiday] = await Promise.all([
    fetchTodayShifts(targetDate),
    fetchNextHoliday(targetDate),
  ]);

  return {
    schedule,
    dateStr,
    activeStaff,
    otherDutyStaff,
    offStaff,
    headcount,
    holiday:
      holiday && holiday.ok === true && typeof holiday.daysRemaining === 'number'
        ? { name: holiday.name, daysRemaining: holiday.daysRemaining }
        : null,
  };
}

/**
 * Compiles shift + holiday data for the daily report notification.
 *
 * - `today` (default): 05:00 ICT cron ตารางงานของวันนั้น
 * - `tomorrow`: 18:00 ICT cron ตารางงานของวันถัดไป
 */
export async function compileDailyReportData(
  schedule: DailyReportSchedule = 'today',
  now: Date = new Date(),
): Promise<DailyReportData> {
  const reportIso = resolveDailyReportTargetIso(schedule, now);
  const reportDate = bangkokCalendarIsoToDate(reportIso);
  return compileDailyReportDataForDate(reportDate, schedule);
}
