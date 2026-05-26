'use server';

import { createClient } from '@supabase/supabase-js';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey, {
  global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
});

// Time values recognized as active working shifts (chronological order)
const ACTIVE_TIME_VALUES = ['6:30', '7:00', '8:00'];

/**
 * Parses a shift time string into a numeric value for chronological sorting.
 * e.g. "6:30" -> 6.5, "7:00" -> 7.0, "8:00" -> 8.0
 */
function parseShiftTimeToNumber(timeStr: string): number {
  const cleaned = timeStr.replace(/^เข้ากะ\s*/, '').trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return Infinity;
  return parseInt(match[1], 10) + parseInt(match[2], 10) / 60;
}

/**
 * Determines if a shift location value represents an active working time slot.
 */
function isActiveShift(location: string): boolean {
  const cleaned = location.replace(/^เข้ากะ\s*/, '').trim();
  return ACTIVE_TIME_VALUES.includes(cleaned);
}

interface StaffShiftEntry {
  name: string;
  shiftText: string;
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

    profiles.forEach(profile => {
      const shift = shifts.find(s => s.employee_id === profile.id);

      let shiftText = 'วันหยุด'; // Default: empty/null/blank → "วันหยุด"

      if (shift && shift.status && shift.status !== 'on_leave' && shift.metadata?.location) {
        const rawLocation = shift.metadata.location;

        if (rawLocation === 'ลา') {
          shiftText = 'ลา';
        } else {
          // Strip "เข้ากะ" prefix
          shiftText = rawLocation.replace(/^เข้ากะ\s*/, '').trim();

          if (!shiftText) {
            shiftText = 'วันหยุด'; // Blank after stripping → "วันหยุด"
          }
        }
      } else if (shift && (shift.status === 'on_leave' || shift.metadata?.location === 'ลา')) {
        shiftText = 'ลา';
      }

      // Classify into Active or Off/Leave block
      if (isActiveShift(shiftText)) {
        activeStaff.push({ name: profile.full_name, shiftText });
      } else {
        offStaff.push({ name: profile.full_name, shiftText });
      }
    });

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
 * - Filter ONLY between 06:30 AM and 18:00 PM ICT
 * - Weather Fallback Rule: If no severe storms, errors, or exceptional data → "สภาพอากาศปกติ"
 * - Do NOT display missing placeholder warnings
 */
export async function fetchWeatherForecast() {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) return { summary: 'สภาพอากาศปกติ', maxPop: 0, warningPeriods: [] };

    // Lat/Lon for Lam Luk Ka, Pathum Thani as specified
    const lat = '13.929692';
    const lon = '100.716932';
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=th`;

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      // Fallback: return normal weather status on API error
      return { summary: 'สภาพอากาศปกติ', maxPop: 0, warningPeriods: [] };
    }

    const data = await response.json();

    // Get today's start and end in UTC for 06:30 - 18:00 ICT
    const now = new Date();
    const today = toZonedTime(now, 'Asia/Bangkok');
    today.setHours(0, 0, 0, 0);
    const dateStr = format(today, 'yyyy-MM-dd');

    const workingHours = (data.list || []).filter((item: any) => {
      const forecastTime = toZonedTime(new Date(item.dt * 1000), 'Asia/Bangkok');
      const forecastDateStr = format(forecastTime, 'yyyy-MM-dd');

      if (forecastDateStr !== dateStr) return false;

      const hour = forecastTime.getHours();
      const min = forecastTime.getMinutes();
      const timeNum = hour + (min / 60);

      // Strict Working-Hour Window: 06:30 - 18:00 ICT
      return timeNum >= 6.5 && timeNum <= 18;
    });

    if (workingHours.length === 0) {
      // No data in working hours → default to normal (no placeholder warning)
      return { summary: 'สภาพอากาศปกติ', maxPop: 0, warningPeriods: [] };
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
      summary,
      maxPop,
      warningPeriods: warnings
    };

  } catch (error) {
    console.error('[fetchWeatherForecast] Error:', error);
    // Fallback: return normal status on any error (no placeholder warnings)
    return { summary: 'สภาพอากาศปกติ', maxPop: 0, warningPeriods: [] };
  }
}

/**
 * SPEC: Proactive Holiday Threshold Rule
 * 
 * Fetches next upcoming Thai national public holiday and calculates countdown.
 */
export async function fetchNextHoliday(targetDate: Date) {
  try {
    const dateStr = format(targetDate, 'yyyy-MM-dd');

    const { data, error } = await supabaseAdmin
      .from('holidays')
      .select('name, date')
      .gte('date', dateStr)
      .order('date', { ascending: true })
      .limit(1)
      .single();

    if (error || !data) return null;

    const holidayDate = startOfDay(new Date(data.date));
    const targetMidnight = startOfDay(targetDate);
    const diff = differenceInDays(holidayDate, targetMidnight);
    return { name: data.name, daysRemaining: diff };
  } catch (error) {
    console.error('[fetchNextHoliday] Error:', error);
    return null;
  }
}

/**
 * SPEC: Strategic Advice Generator (Rule-Based)
 * 
 * - If countdown <= 7 days: MUST pivot to proactive tactical alert
 *   - DO NOT say "สถานการณ์ปกติ" within this 7-day window
 *   - Tier 0: วันหยุดวันนี้ (holiday today)
 *   - Tier 1-3: เร่งด่วน (urgent)
 *   - Tier 4-7: เตือนล่วงหน้า (advance warning)
 * - If countdown > 7 days: standard operational status
 */
function generateStrategicAdvice(weather: any, holiday: any) {
  const advices = [];

  // Weather-based advice
  if (weather.maxPop > 60) {
    advices.push('ฝนตกหนัก เตรียมรับมือออเดอร์เดลิเวอรี และตรวจสอบบรรจุภัณฑ์ให้พร้อม');
  } else if (weather.summary.includes('ร้อน')) {
    advices.push('อากาศร้อน คาดว่าเมนูเย็น/ปั่นจะขายดี ตรวจสอบน้ำแข็งให้เพียงพอ');
  }

  // Holiday-based advice with 7-day threshold
  if (holiday && holiday.daysRemaining <= 7) {
    if (holiday.daysRemaining === 0) {
      // Tier 0: Holiday today
      advices.push(`🔴 วันนี้เป็นวันหยุดนักขัตฤกษ์ (${holiday.name}) คาดว่าลูกค้าหน้าร้านจะหนาแน่นเป็นพิเศษ เตรียมกำลังพลและวัตถุดิบให้พร้อมรับมือ`);
    } else if (holiday.daysRemaining <= 3) {
      // Tier 1-3: Urgent pre-holiday
      advices.push(`🟠 เหลืออีก ${holiday.daysRemaining} วันถึง ${holiday.name} — เร่งตรวจสอบสต็อกวัตถุดิบหลัก แก้ว ฝา หลอด และสั่งเติมสินค้าที่ใกล้จุดสั่งซื้อทันที เพื่อรองรับยอดขายช่วงเทศกาล`);
    } else {
      // Tier 4-7: Advance warning
      advices.push(`🟡 อีก ${holiday.daysRemaining} วันจะถึง ${holiday.name} — แนะนำให้เริ่มตรวจสอบปริมาณสต็อกคงคลังและวางแผนสั่งซื้อล่วงหน้า เพื่อป้องกันสินค้าขาดช่วง peak traffic`);
    }
  }

  // Default: ONLY if no holiday within 7 days AND no weather concerns
  if (advices.length === 0) {
    advices.push('สถานการณ์ปกติ ลุยงานกันเลย!');
  }

  return advices.join(' | ');
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
  const dateStr = format(today, 'dd/MM/yyyy');

  const [{ activeStaff, offStaff, headcount }, weather, holiday] = await Promise.all([
    fetchTodayShifts(today),
    fetchWeatherForecast(),
    fetchNextHoliday(today)
  ]);

  // Build staff section with two blocks separated by empty line
  const activeLines = activeStaff.map(s => `- ${s.name}: ${s.shiftText}`).join('\n');
  const offLines = offStaff.map(s => `- ${s.name}: ${s.shiftText}`).join('\n');

  let staffSection = '';
  if (activeLines && offLines) {
    staffSection = `${activeLines}\n\n${offLines}`;
  } else if (activeLines) {
    staffSection = activeLines;
  } else if (offLines) {
    staffSection = offLines;
  } else {
    staffSection = '- ไม่มีข้อมูลพนักงานในระบบ';
  }



  // Build weather section
  const weatherWarnings = weather.warningPeriods.length > 0
    ? weather.warningPeriods.join(', ')
    : 'ไม่มีช่วงเวลาเสี่ยงพิเศษ';

  // Build holiday section
  const holidayText = holiday
    ? `${holiday.name} (อีก ${holiday.daysRemaining} วัน)`
    : 'ไม่มีข้อมูลวันหยุดในระบบ';

  const strategy = generateStrategicAdvice(weather, holiday);

  const payload = `รายงานสรุปประจำวันที่ ${dateStr}

👥 [พนักงาน]
รวมวันนี้: ${headcount} คน
${staffSection}

🌦️ [สภาพอากาศ]
- ภาพรวม: ${weather.summary}
- โอกาสเกิดฝน: ${weather.maxPop}%
- ช่วงเวลาที่ต้องเฝ้าระวัง: ${weatherWarnings}

📅 [วันหยุดนักขัตฤกษ์]
- วันหยุดนักขัตฤกษ์ถัดไป: ${holidayText}
- คำแนะนำ: ${strategy}`;

  return payload;
}
