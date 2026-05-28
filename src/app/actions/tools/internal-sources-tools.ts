import { tool } from 'ai';
import { z } from 'zod';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import {
  fetchTodayShifts,
  fetchWeatherForecast,
  fetchNextHoliday,
} from '@/app/actions/daily-report-actions';

const THAI_REPORT_DATE_FORMAT = 'dd-MM-yyyy';

function safeError(err: any) {
  return {
    message: err?.message || 'Unknown error',
    details: err?.details ?? null,
    hint: err?.hint ?? null,
  };
}

export const getDailyReportSourcesTool = tool({
  description: 'ดึงชุดข้อมูลภายในทั้งหมด (กะพนักงาน + อากาศ + วันหยุด) โดยระบุวันที่เลือกได้ หรือใช้ค่าเริ่มต้นเป็นวันนี้หากไม่ระบุ',
  inputSchema: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('วันที่ในรูปแบบ YYYY-MM-DD เช่น วันพรุ่งนี้')
  }),
  execute: async ({ date }) => {
    try {
      const base = date ? new Date(`${date}T00:00:00.000Z`) : new Date();
      const zoned = toZonedTime(base, 'Asia/Bangkok');
      zoned.setHours(0, 0, 0, 0);
      const [{ activeStaff, offStaff, headcount }, weather, holiday] = await Promise.all([
        fetchTodayShifts(zoned),
        fetchWeatherForecast(zoned),
        fetchNextHoliday(zoned),
      ]);
      return {
        ok: true,
        data: {
          reportDateThai: format(zoned, 'dd-MM-yyyy'),
          staff: { activeStaff: activeStaff ?? [], offStaff: offStaff ?? [], headcount: headcount || 0 },
          weather: { summary: weather?.summary ?? 'สภาพอากาศปกติ', maxPop: weather?.maxPop || 0 },
          holiday: holiday ?? null,
        },
      };
    } catch (err: any) { return { ok: false, data: null, error: { message: err?.message } }; }
  },
});

export const weatherTool = tool({
  description: 'ดึงข้อมูลสภาพอากาศจาก OpenWeather และวันหยุดถัดไป (ระบุวันที่เลือกได้)',
  inputSchema: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('วันที่ในรูปแบบ YYYY-MM-DD')
  }),
  execute: async ({ date }) => {
    try {
      const base = date ? new Date(`${date}T00:00:00.000Z`) : new Date();
      const zoned = toZonedTime(base, 'Asia/Bangkok');
      zoned.setHours(0, 0, 0, 0);
      const [weather, holiday] = await Promise.all([fetchWeatherForecast(zoned), fetchNextHoliday(zoned)]);
      return {
        ok: true,
        data: {
          reportDateThai: format(zoned, 'dd-MM-yyyy'),
          weather: { summary: weather?.summary ?? 'สภาพอากาศปกติ', maxPop: weather?.maxPop || 0 },
          holiday: holiday ?? null,
        },
      };
    } catch (err: any) { return { ok: false, data: null, error: { message: err?.message } }; }
  },
});
