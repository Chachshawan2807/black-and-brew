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
  description:
    'ดึงชุดข้อมูลภายในทั้งหมดที่ใช้สร้าง Daily LINE Report (กะพนักงาน + อากาศ + วันหยุด) เพื่อให้ AI ใช้เป็น Primary Truth ก่อนตอบ',
  inputSchema: z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe('วันที่ (YYYY-MM-DD) หากไม่ส่งจะใช้ วันนี้ ตาม Asia/Bangkok'),
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
          reportDateThai: format(zoned, THAI_REPORT_DATE_FORMAT),
          reportDateISO: format(zoned, 'yyyy-MM-dd'),
          staff: {
            activeStaff: activeStaff ?? [],
            offStaff: offStaff ?? [],
            headcount: Number.isFinite(headcount) ? headcount : 0,
          },
          weather: {
            ok: weather?.ok ?? true,
            error: weather?.error ?? null,
            dataWindowEmpty: weather?.dataWindowEmpty ?? false,
            summary: weather?.summary ?? 'สภาพอากาศปกติ',
            maxPop: typeof weather?.maxPop === 'number' ? weather.maxPop : 0,
            warningPeriods: Array.isArray(weather?.warningPeriods)
              ? weather.warningPeriods
              : [],
          },
          holiday: holiday ?? null,
        },
      };
    } catch (err: any) {
      return { ok: false, data: null, error: safeError(err) };
    }
  },
});

