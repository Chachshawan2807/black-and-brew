
import { createClient } from '@supabase/supabase-js';
import { addDays, format, differenceInDays, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { formatDailyShifts } from '@/lib/schedule/format-daily-shifts';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const getSupabaseAdmin = () => {
  const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseAdminKey) return null;
  return createClient(supabaseUrl, supabaseAdminKey, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
  });
};

export interface StaffShiftEntry {
  name: string;
  shiftText: string;
}

export interface DailyReportData {
  schedule: DailyReportSchedule;
  dateStr: string;
  /** Timed front-store shifts only (6:30, 7:00, 8:00, …) — counted in headcount */
  activeStaff: StaffShiftEntry[];
  /** Non-timed duties (ร้านซักผ้า, ไปสาขา 2) — shown under เข้างาน, not counted */
  otherDutyStaff: StaffShiftEntry[];
  offStaff: StaffShiftEntry[];
  headcount: number;
  holiday: { name: string; daysRemaining: number } | null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getErrorDetails(error: unknown): unknown {
  return error && typeof error === 'object' && 'details' in error
    ? (error as { details?: unknown }).details
    : null;
}

/** Thai display format for report header (DD/MM/YYYY). */
const THAI_REPORT_DATE_FORMAT = 'dd-MM-yyyy';

/**
 * SPEC: Staff Shift Chronological Sorting
 *
 * Uses the same `formatDailyShifts` pipeline as the schedule page so
 * notification summaries always match the roster UI.
 */
export async function fetchTodayShifts(targetDate: Date) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      console.error('[fetchTodayShifts] Missing SUPABASE_SERVICE_ROLE_KEY');
      return { activeStaff: [], otherDutyStaff: [], offStaff: [], headcount: 0 };
    }

    const dateStr = format(targetDate, 'yyyy-MM-dd');

    const [profilesRes, shiftsRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, full_name, schedule_order').order('schedule_order', { ascending: true }),
      supabaseAdmin.from('shifts')
        .select('id, employee_id, status, metadata')
        .gte('start_time', `${dateStr}T00:00:00`)
        .lte('start_time', `${dateStr}T23:59:59`)
    ]);

    if (profilesRes.error) {
      console.error('[fetchTodayShifts] Profiles error:', profilesRes.error.message, profilesRes.error.details);
      throw profilesRes.error;
    }
    if (shiftsRes.error) {
      console.error('[fetchTodayShifts] Shifts error:', shiftsRes.error.message, shiftsRes.error.details);
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
    if (!supabaseAdmin) {
      return { ok: false, error: { message: 'Missing SUPABASE_SERVICE_ROLE_KEY', details: null } };
    }

    const dateStr = format(targetDate, 'yyyy-MM-dd');

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

/** Which calendar day the daily schedule notification should cover. */
export type DailyReportSchedule = 'today' | 'tomorrow';

/** Evening cron boundary in Asia/Bangkok (18:00 ICT → tomorrow's schedule). */
const EVENING_SCHEDULE_HOUR_ICT = 18;

/**
 * Resolves which day's schedule the notification should cover.
 * Explicit `?schedule=` wins; otherwise infers from Bangkok wall-clock hour.
 */
export function resolveDailyReportSchedule(
  explicit: string | null,
  now: Date = new Date(),
): DailyReportSchedule {
  if (explicit === 'tomorrow') return 'tomorrow';
  if (explicit === 'today') return 'today';

  const bkkHour = toZonedTime(now, 'Asia/Bangkok').getHours();
  return bkkHour >= EVENING_SCHEDULE_HOUR_ICT ? 'tomorrow' : 'today';
}

/**
 * Compiles shift + holiday data for a specific calendar day.
 * Shared by cron jobs and live notification refresh after roster edits.
 */
export async function compileDailyReportDataForDate(
  targetDate: Date,
  schedule: DailyReportSchedule,
): Promise<DailyReportData> {
  const dateStr = format(targetDate, THAI_REPORT_DATE_FORMAT);

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
 * - `today` (default): 05:00 ICT cron — ตารางงานของวันนั้น
 * - `tomorrow`: 18:00 ICT cron — ตารางงานของวันถัดไป
 */
export async function compileDailyReportData(
  schedule: DailyReportSchedule = 'today',
): Promise<DailyReportData> {
  const now = new Date();
  const bkkNow = toZonedTime(now, 'Asia/Bangkok');
  const reportDate = schedule === 'tomorrow' ? addDays(bkkNow, 1) : bkkNow;
  return compileDailyReportDataForDate(reportDate, schedule);
}
