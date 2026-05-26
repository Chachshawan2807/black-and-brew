'use server';

import { createClient } from '@supabase/supabase-js';
import { format, differenceInDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey, {
  global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
});

const MASTER_ORDER = ['นิต้า', 'ปิ่น', 'มุก', 'เม', 'มีนา', 'หนูดี', 'ชัช', 'ฟิว', 'ล่า'];

export async function fetchTodayShifts(targetDate: Date) {
  try {
    const dateStr = format(targetDate, 'yyyy-MM-dd');
    
    // Fetch all profiles and shifts for today
    const [profilesRes, shiftsRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, full_name'),
      supabaseAdmin.from('shifts')
        .select('id, employee_id, status, metadata')
        .gte('start_time', `${dateStr}T00:00:00`)
        .lte('start_time', `${dateStr}T23:59:59`)
    ]);

    const profiles = profilesRes.data || [];
    const shifts = shiftsRes.data || [];

    let headcount = 0;
    const staffShifts = MASTER_ORDER.map(name => {
      const profile = profiles.find(p => p.full_name === name);
      if (!profile) return { name, shiftText: 'ไม่มีข้อมูลพนักงาน' };

      const shift = shifts.find(s => s.employee_id === profile.id);
      
      let shiftText = 'วันหยุด';
      if (shift && shift.status && shift.status !== 'on_leave' && shift.metadata?.location && shift.metadata.location !== 'ลา') {
         shiftText = shift.metadata.location.replace(/^เข้ากะ\s*/, '').trim();
         headcount++;
      } else if (shift && (shift.status === 'on_leave' || shift.metadata?.location === 'ลา')) {
         shiftText = 'ลา';
      }

      return { name, shiftText };
    });

    return { staffShifts, headcount };
  } catch (error) {
    console.error('[fetchTodayShifts] Error:', error);
    return { staffShifts: MASTER_ORDER.map(name => ({ name, shiftText: 'Error fetching' })), headcount: 0 };
  }
}

export async function fetchCriticalInventory() {
  try {
    const { data: items, error } = await supabaseAdmin
      .from('inventory_items')
      .select('name, stock, order_point')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    const criticalItems = (items || []).filter(item => {
      const stock = Number(item.stock) || 0;
      const orderPoint = Number(item.order_point) || 0;
      return stock <= orderPoint + 2;
    }).map(item => {
      const stock = Number(item.stock) || 0;
      const orderPoint = Number(item.order_point) || 0;
      const isOut = stock === 0;
      return `- ${item.name}: คงเหลือ ${stock} ${isOut ? '(สินค้าหมด วิกฤต!)' : `(จุดสั่งซื้อ ${orderPoint})`}`;
    });

    return criticalItems;
  } catch (error) {
    console.error('[fetchCriticalInventory] Error:', error);
    return ['- Error fetching inventory data'];
  }
}

export async function fetchWeatherForecast() {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) return { summary: 'ไม่มี API Key', maxPop: 0, warningPeriods: [] };

    // Lat/Lon for Lam Luk Ka, Pathum Thani as specified
    const lat = '13.929692';
    const lon = '100.716932';
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=th`;

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('OpenWeather API Error');
    
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
      
      return timeNum >= 6.5 && timeNum <= 18;
    });

    if (workingHours.length === 0) {
      return { summary: 'ไม่มีข้อมูลสภาพอากาศในช่วงเวลาทำงาน', maxPop: 0, warningPeriods: [] };
    }

    let maxPop = 0;
    const warnings: string[] = [];
    const conditions = new Set<string>();

    workingHours.forEach((item: any) => {
      const pop = Math.round((item.pop || 0) * 100);
      if (pop > maxPop) maxPop = pop;
      
      if (item.weather && item.weather[0]) {
         conditions.add(item.weather[0].description);
      }

      if (pop >= 50 || (item.rain && item.rain['3h'] > 5)) {
        const time = toZonedTime(new Date(item.dt * 1000), 'Asia/Bangkok');
        const hour = time.getHours();
        warnings.push(`${hour}:00-${hour+3}:00 น. (โอกาสฝน ${pop}%)`);
      }
    });

    const summary = Array.from(conditions).join(', ') || 'ปกติ';

    return {
      summary,
      maxPop,
      warningPeriods: warnings
    };

  } catch (error) {
    console.error('[fetchWeatherForecast] Error:', error);
    return { summary: 'ไม่สามารถดึงข้อมูลได้', maxPop: 0, warningPeriods: [] };
  }
}

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

    const diff = differenceInDays(new Date(data.date), targetDate);
    return { name: data.name, daysRemaining: diff };
  } catch (error) {
    console.error('[fetchNextHoliday] Error:', error);
    return null;
  }
}

function generateStrategicAdvice(weather: any, holiday: any) {
  const advices = [];
  
  if (weather.maxPop > 60) {
    advices.push('ฝนตกหนัก เตรียมรับมือออเดอร์เดลิเวอรี และตรวจสอบบรรจุภัณฑ์ให้พร้อม');
  } else if (weather.summary.includes('ร้อน')) {
    advices.push('อากาศร้อน คาดว่าเมนูเย็น/ปั่นจะขายดี ตรวจสอบน้ำแข็งให้เพียงพอ');
  }

  if (holiday && holiday.daysRemaining <= 3) {
    if (holiday.daysRemaining === 0) {
       advices.push(`วันนี้เป็นวันหยุด (${holiday.name}) เตรียมรับมือลูกค้าหน้าร้านหนาแน่น`);
    } else {
       advices.push(`ใกล้เทศกาล ${holiday.name} ในอีก ${holiday.daysRemaining} วัน ตรวจเช็กสต็อกวัตถุดิบและแก้วให้พร้อม`);
    }
  }

  if (advices.length === 0) {
    advices.push('สถานการณ์ปกติ ลุยงานกันเลย!');
  }

  return advices.join(' | ');
}

export async function compileDailyReportPayload() {
  const now = new Date();
  const today = toZonedTime(now, 'Asia/Bangkok');
  const dateStr = format(today, 'dd/MM/yyyy');

  const [{ staffShifts, headcount }, inventoryAlerts, weather, holiday] = await Promise.all([
    fetchTodayShifts(today),
    fetchCriticalInventory(),
    fetchWeatherForecast(),
    fetchNextHoliday(today)
  ]);

  let inventorySection = inventoryAlerts.join('\\n');
  if (inventoryAlerts.length === 0) {
    inventorySection = '- ไม่มีสินค้าวิกฤตหรือต้องสั่งซื้อในระบบ';
  }

  const weatherWarnings = weather.warningPeriods.length > 0 
    ? weather.warningPeriods.join(', ')
    : 'ไม่มีช่วงเวลาเสี่ยงพิเศษ';

  const holidayText = holiday 
    ? `${holiday.name} (อีก ${holiday.daysRemaining} วัน)` 
    : 'ไม่มีข้อมูลวันหยุดในระบบ';

  const strategy = generateStrategicAdvice(weather, holiday);

  const payload = `รายงานสรุปการดำเนินงานประจำวันที่ ${dateStr}

👥 [ปัจจัยภายใน: กำลังพลและกะทำงาน]
รวมพนักงานปฏิบัติงานวันนี้: ${headcount} คน
${staffShifts.map(s => `- ${s.name}: ${s.shiftText}`).join('\\n')}

📦 [ปัจจัยภายใน: คลังสินค้าวิกฤต/ต้องสั่งซื้อ]
${inventorySection}

🌦️ [ปัจจัยภายนอก: สภาพอากาศพิกัดร้าน (06:30 - 18:00 น.)]
- ภาพรวมทั้งวัน: ${weather.summary}
- โอกาสเกิดฝน/มรสุม: ${weather.maxPop}%
- ช่วงเวลาที่ต้องเฝ้าระวัง: ${weatherWarnings}

📅 [ปัจจัยภายนอก: แผนกลยุทธ์เทศกาล]
- วันหยุดนักขัตฤกษ์ถัดไป: ${holidayText}
- คำแนะนำกลยุทธ์หน้าร้านจากบรู: ${strategy}`;

  // Use raw line breaks since we're using template literals that evaluate \n to actual line breaks
  return payload.replace(/\\n/g, '\n');
}
