
import { createClient } from '@supabase/supabase-js';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const getSupabaseAdmin = () => {
  const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseAdminKey) return null;
  return createClient(supabaseUrl, supabaseAdminKey, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
  });
};

// Time values recognized as active working shifts (chronological order)
const ACTIVE_TIME_VALUES = ['6:00', '6:30', '7:00', '8:00'];

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

/**
 * Determines if a shift location value represents an active working time slot.
 */
function isActiveShift(location: string): boolean {
  const cleaned = location.replace(/^เข้ากะ\s*/, '').trim();
  // ปรับปรุงให้ยืดหยุ่น: ตรวจสอบรูปแบบเวลา HH:MM ที่จุดเริ่มต้น เพื่อรองรับ 8:00, 08:00 หรือเวลาที่มีข้อความต่อท้าย
  return /^\d{1,2}:\d{2}/.test(cleaned);
}

interface StaffShiftEntry {
  name: string;
  shiftText: string;
}

/** Thai display format for report header (DD/MM/YYYY). */
const THAI_REPORT_DATE_FORMAT = 'dd-MM-yyyy';

const DAY_OFF_SHIFT_TEXT = 'วันหยุด';

/**
 * Normalizes legacy/empty shift labels into standard day-off status.
 * Never surfaces "ไม่มีกะ" in the LINE report.
 */
function normalizeShiftText(shiftText: string): string {
  const trimmed = shiftText.trim();
  const dayOffAliases = new Set(['', 'ไม่มีกะ', 'ไม่มีข้อมูล', 'null', 'undefined']);
  if (dayOffAliases.has(trimmed.toLowerCase())) return DAY_OFF_SHIFT_TEXT;
  return trimmed;
}

function formatStaffLine(name: string, value: string): string {
  return `- ${name} (${value})`;
}

/**
 * Builds the staff block into exactly two groups:
 * 1) Active shift lines
 * 2) Non-working / special status lines
 * Groups are separated by exactly one blank line when both exist.
 */
function formatStaffSection(activeStaff: StaffShiftEntry[], offStaff: StaffShiftEntry[]): string {
  const normalizedOffStaff = offStaff.map((entry) => ({
    ...entry,
    shiftText: normalizeShiftText(entry.shiftText),
  }));

  const activeLines = activeStaff.map((s) => formatStaffLine(s.name, s.shiftText));
  const nonWorkingLines = normalizedOffStaff.map((s) => formatStaffLine(s.name, s.shiftText));

  if (activeLines.length > 0 && nonWorkingLines.length > 0) {
    return `${activeLines.join('\n')}\n\n${nonWorkingLines.join('\n')}`;
  }

  if (activeLines.length > 0) return activeLines.join('\n');
  if (nonWorkingLines.length > 0) return nonWorkingLines.join('\n');
  return '- ไม่มีข้อมูลพนักงานในระบบ';
}

/**
 * SPEC: Staff Shift Chronological Sorting
 * 
 * Fetches daily shifts and splits into two blocks:
 * a) Active Block (Top): Employees with explicit working time slots, sorted chronologically
 * b) Off/Leave Block (Bottom): Employees marked as วันหยุด, ลา, or non-time custom text
 * 
 * - If shift field is empty/null/blank → default to "วันหยุด"
 * - Strip prefix "เข้ากะ" entirely
 * - Headcount based ONLY on active working staff in the Top block
 */
export async function fetchTodayShifts(targetDate: Date) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      console.error('[fetchTodayShifts] Missing SUPABASE_SERVICE_ROLE_KEY');
      return { activeStaff: [], offStaff: [], headcount: 0 };
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

    const profiles = profilesRes.data || [];
    const shifts = shiftsRes.data || [];

    const activeStaff: StaffShiftEntry[] = [];
    const offStaff: StaffShiftEntry[] = [];

    // Exhaustive loop: process every staff profile entry, no early break.
    for (const profile of profiles) {
      const profileName = typeof profile?.full_name === 'string' && profile.full_name.trim()
        ? profile.full_name.trim()
        : 'ไม่ระบุชื่อ';

      try {
        const shift = shifts.find((s: any) => s?.employee_id === profile?.id);
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

        // Classify into Active or Off/Leave block
        if (isActiveShift(shiftText)) {
          activeStaff.push({ name: profileName, shiftText });
        } else {
          offStaff.push({ name: profileName, shiftText });
        }
      } catch (profileError: any) {
        // Never let one broken profile mapping truncate the whole report.
        console.error('[fetchTodayShifts] Profile mapping error:', {
          profileId: profile?.id,
          profileName,
          message: profileError?.message || profileError,
        });
        offStaff.push({ name: profileName, shiftText: DAY_OFF_SHIFT_TEXT });
        continue;
      }
    }

    // Sort Active block chronologically (earliest → latest)
    activeStaff.sort((a, b) => parseShiftTimeToNumber(a.shiftText) - parseShiftTimeToNumber(b.shiftText));

    const headcount = activeStaff.length;

    return { activeStaff, offStaff, headcount };
  } catch (error) {
    console.error('[fetchTodayShifts] Error:', error);
    return { activeStaff: [], offStaff: [], headcount: 0 };
  }
}



/**
 * SPEC: Hyper-local Weather Analysis
 * 
 * - Filter ONLY between 06:00 AM and 18:00 PM ICT
 * - Weather Fallback Rule: If no severe storms, errors, or exceptional data → "สภาพอากาศปกติ"
 * - Do NOT display missing placeholder warnings
 */
export async function fetchWeatherForecast(targetDate?: Date) {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        error: { message: 'Missing OPENWEATHER_API_KEY', details: null },
        summary: 'สภาพอากาศปกติ',
        maxPop: 0,
        warningPeriods: [],
      };
    }

    // Lat/Lon for Lam Luk Ka, Pathum Thani as specified
    const lat = process.env.NEXT_PUBLIC_STORE_LAT || '13.929692';
    const lon = process.env.NEXT_PUBLIC_STORE_LON || '100.716932';
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=th`;

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      // Fallback: return normal weather status on API error
      return {
        ok: false,
        error: { message: 'OpenWeatherMap responded with error', details: response.statusText },
        summary: 'สภาพอากาศปกติ',
        maxPop: 0,
        warningPeriods: [],
      };
    }

    const data = await response.json();

    // Get target day's start/end in Asia/Bangkok for 06:30 - 18:00 ICT
    const base = targetDate ?? new Date();
    const today = toZonedTime(base, 'Asia/Bangkok');
    today.setHours(0, 0, 0, 0);
    const dateStr = format(today, 'yyyy-MM-dd');

    const workingHours = (data.list || []).filter((item: any) => {
      const forecastTime = toZonedTime(new Date(item.dt * 1000), 'Asia/Bangkok');
      const forecastDateStr = format(forecastTime, 'yyyy-MM-dd');

      if (forecastDateStr !== dateStr) return false;

      const hour = forecastTime.getHours();
      const min = forecastTime.getMinutes();
      const timeNum = hour + (min / 60);

      // Strict Working-Hour Window: 06:00 - 18:00 ICT
      return timeNum >= 6 && timeNum <= 18;
    });

    if (workingHours.length === 0) {
      // No data in working hours → default to normal (no placeholder warning)
      return {
        ok: true,
        dataWindowEmpty: true,
        summary: 'สภาพอากาศปกติ',
        maxPop: 0,
        warningPeriods: [],
      };
    }

    let maxPop = 0;
    const warnings: string[] = [];
    let hasSevereWeather = false;

    workingHours.forEach((item: any) => {
      const pop = Math.round((item.pop || 0) * 100);
      if (pop > maxPop) maxPop = pop;

      // Check for severe weather conditions (thunderstorm, heavy rain, etc.)
      if (item.weather && item.weather[0]) {
        const mainWeather = item.weather[0].main?.toLowerCase() || '';
        if (mainWeather === 'thunderstorm' || mainWeather === 'squall' || mainWeather === 'tornado') {
          hasSevereWeather = true;
        }
      }

      if (pop >= 50 || (item.rain && item.rain['3h'] > 5)) {
        const time = toZonedTime(new Date(item.dt * 1000), 'Asia/Bangkok');
        const hour = time.getHours();
        warnings.push(`${hour}:00-${hour + 3}:00 น. (โอกาสฝน ${pop}%)`);
      }
    });

    // Determine summary based on severity
    let summary: string;
    if (hasSevereWeather) {
      const severeConditions = new Set<string>();
      workingHours.forEach((item: any) => {
        if (item.weather && item.weather[0]) {
          severeConditions.add(item.weather[0].description);
        }
      });
      summary = Array.from(severeConditions).join(', ');
    } else if (maxPop >= 50) {
      // High rain probability but not severe storm
      summary = 'มีโอกาสฝนตกในช่วงเวลาทำงาน';
    } else {
      // No severe anomalies → "สภาพอากาศปกติ"
      summary = 'สภาพอากาศปกติ';
    }

    return {
      ok: true,
      summary,
      maxPop,
      warningPeriods: warnings
    };

  } catch (error) {
    console.error('[fetchWeatherForecast] Error:', error);
    // Fallback: return normal status on any error (no placeholder warnings)
    return {
      ok: false,
      error: { message: (error as any)?.message || 'Unknown error', details: (error as any)?.details ?? null },
      summary: 'สภาพอากาศปกติ',
      maxPop: 0,
      warningPeriods: [],
    };
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
    return { ok: false, error: { message: (error as any)?.message || 'Unknown error', details: (error as any)?.details ?? null } };
  }
}

/**
 * SPEC: Compile Daily Report Payload
 * 
 * Master function that compiles all data into the final LINE notification message.
 * Output format MUST match the template exactly.
 */
export async function compileDailyReportPayload() {
  const now = new Date();
  const today = toZonedTime(now, 'Asia/Bangkok');
  const dateStr = format(today, THAI_REPORT_DATE_FORMAT);

  const [{ activeStaff, offStaff, headcount }, holiday] = await Promise.all([
    fetchTodayShifts(today),
    fetchNextHoliday(today)
  ]);

  const staffSection = formatStaffSection(activeStaff, offStaff);

  // Build holiday section
  const holidayText = holiday && holiday.ok === true
    ? `${holiday.name} (อีก ${holiday.daysRemaining} วัน)`
    : 'ไม่มีข้อมูลวันหยุดในระบบ';

  const payload = `== ข้อความอัตโนมัติ ==
รายงานสรุปของเช้าวันที่ ${dateStr}

👥 พนักงาน
รวมวันนี้: ${headcount} คน
${staffSection}

📅 วันหยุดนักขัตฤกษ์
- วันหยุดนักขัตฤกษ์ถัดไป:  ${holidayText}`;

  return payload;
}
