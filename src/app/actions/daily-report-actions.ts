
import { createClient } from '@supabase/supabase-js';
import { addDays, format, differenceInDays, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { categorizeShift } from '@/lib/schedule/format-daily-shifts';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const getSupabaseAdmin = () => {
  const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseAdminKey) return null;
  return createClient(supabaseUrl, supabaseAdminKey, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
  });
};

/**
 * Parses a shift time string into a numeric value for chronological sorting.
 * e.g. "6:30" -> 6.5, "7:00" -> 7.0, "8:00" -> 8.0
 */
function parseShiftTimeToNumber(timeStr: string): number {
  const cleaned = timeStr.replace(/^เข้ากะ\s*/, '').trim();
  // ปรับให้รองรับการดึงเวลาจากข้อความที่มีรายละเอียดต่อท้าย
  const match = cleaned.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return Infinity;
  return parseInt(match[1], 10) + parseInt(match[2], 10) / 60;
}

function classifyShiftText(shiftText: string): 'timed' | 'other_duty' | 'off' {
  const category = categorizeShift(shiftText);
  if (category === 'front_store') return 'timed';
  if (category === 'other_duty') return 'other_duty';
  return 'off';
}

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

type DailyReportProfileRow = {
  id: string | null;
  full_name: string | null;
};

type DailyReportShiftRow = {
  employee_id: string | null;
  status: string | null;
  metadata?: {
    location?: unknown;
  } | null;
};

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

const DAY_OFF_SHIFT_TEXT = 'วันหยุด';

/**
 * Normalizes legacy/empty shift labels into standard day-off status.
 * Never surfaces "ไม่มีกะ" in the daily report.
 */
function normalizeShiftText(shiftText: string): string {
  const trimmed = shiftText.trim();
  const dayOffAliases = new Set(['', 'ไม่มีกะ', 'ไม่มีข้อมูล', 'null', 'undefined']);
  if (dayOffAliases.has(trimmed.toLowerCase())) return DAY_OFF_SHIFT_TEXT;
  return trimmed;
}

/**
 * SPEC: Staff Shift Chronological Sorting
 * 
 * Fetches daily shifts and splits into three blocks:
 * a) Timed shifts — HH:MM slots, sorted chronologically, counted in headcount
 * b) Other duties — ร้านซักผ้า / ไปสาขา 2, profile order, not counted
 * c) Off/Leave — วันหยุด, ลา
 *
 * - If shift field is empty/null/blank → default to "วันหยุด"
 * - Strip prefix "เข้ากะ" entirely
 */
export async function fetchTodayShifts(targetDate: Date) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      console.error('[fetchTodayShifts] Missing SUPABASE_SERVICE_ROLE_KEY');
      return { activeStaff: [], otherDutyStaff: [], offStaff: [], headcount: 0 };
    }

    const dateStr = format(targetDate, 'yyyy-MM-dd');

    // Fetch all profiles dynamically (no hardcoded MASTER_ORDER)
    const [profilesRes, shiftsRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, full_name, schedule_order').order('schedule_order', { ascending: true }),
      supabaseAdmin.from('shifts')
        .select('id, employee_id, status, metadata')
        .gte('start_time', `${dateStr}T00:00:00`)
        .lte('start_time', `${dateStr}T23:59:59`)
    ]);

    const profiles = (profilesRes.data || []) as DailyReportProfileRow[];
    const shifts = (shiftsRes.data || []) as DailyReportShiftRow[];

    const activeStaff: StaffShiftEntry[] = [];
    const otherDutyStaff: StaffShiftEntry[] = [];
    const offStaff: StaffShiftEntry[] = [];

    // Exhaustive loop: process every staff profile entry, no early break.
    for (const profile of profiles) {
      const profileName = typeof profile?.full_name === 'string' && profile.full_name.trim()
        ? profile.full_name.trim()
        : 'ไม่ระบุชื่อ';

      try {
        const shift = shifts.find((s) => s?.employee_id === profile?.id);
        let shiftText = DAY_OFF_SHIFT_TEXT; // strict default for missing/null/blank schedule

        // Missing shift record, null schedule, undefined schedule, blank schedule => วันหยุด
        if (!shift) {
          shiftText = DAY_OFF_SHIFT_TEXT;
        } else if (shift.status === 'on_leave' || shift.metadata?.location === 'ลา') {
          shiftText = 'ลา';
        } else {
          const rawLocation = shift.metadata?.location;

          if (typeof rawLocation === 'string') {
            // Strip "เข้ากะ" prefix and normalize blank/null-like text.
            shiftText = normalizeShiftText(rawLocation.replace(/^เข้ากะ\s*/, ''));
          } else {
            // null | undefined | non-string schedule payload => day off
            shiftText = DAY_OFF_SHIFT_TEXT;
          }
        }

        shiftText = normalizeShiftText(shiftText);

        const bucket = classifyShiftText(shiftText);
        const entry = { name: profileName, shiftText };
        if (bucket === 'timed') {
          activeStaff.push(entry);
        } else if (bucket === 'other_duty') {
          otherDutyStaff.push(entry);
        } else {
          offStaff.push(entry);
        }
      } catch (profileError: unknown) {
        // Never let one broken profile mapping truncate the whole report.
        console.error('[fetchTodayShifts] Profile mapping error:', {
          profileId: profile?.id,
          profileName,
          message: getErrorMessage(profileError),
        });
        offStaff.push({ name: profileName, shiftText: DAY_OFF_SHIFT_TEXT });
        continue;
      }
    }

    // Sort Active block chronologically (earliest → latest)
    activeStaff.sort((a, b) => parseShiftTimeToNumber(a.shiftText) - parseShiftTimeToNumber(b.shiftText));

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
  const dateStr = format(reportDate, THAI_REPORT_DATE_FORMAT);

  const [{ activeStaff, otherDutyStaff, offStaff, headcount }, holiday] = await Promise.all([
    fetchTodayShifts(reportDate),
    fetchNextHoliday(reportDate),
  ]);

  const normalizedOffStaff = offStaff.map((entry) => ({
    ...entry,
    shiftText: normalizeShiftText(entry.shiftText),
  }));

  return {
    schedule,
    dateStr,
    activeStaff,
    otherDutyStaff,
    offStaff: normalizedOffStaff,
    headcount,
    holiday:
      holiday && holiday.ok === true && typeof holiday.daysRemaining === 'number'
        ? { name: holiday.name, daysRemaining: holiday.daysRemaining }
        : null,
  };
}
