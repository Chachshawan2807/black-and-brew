import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';


// Define mutable mock data variables
let mockProfilesData: any[] = [];
let mockShiftsData: any[] = [];
let mockInventoryItemsData: any[] = [];
let mockHolidaysData: any | null = null;

let mockProfilesError: any = null;
let mockShiftsError: any = null;
let mockInventoryItemsError: any = null;
let mockHolidaysError: any = null;

// Mock the entire supabase-js dependency BEFORE importing modules that use it
vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn(() => ({
      from: vi.fn((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockImplementation(() => {
              return Promise.resolve({ data: mockProfilesData, error: mockProfilesError });
            })
          };
        }
        if (table === 'shifts') {
          return {
            select: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockImplementation(() => {
              return Promise.resolve({ data: mockShiftsData, error: mockShiftsError });
            })
          };
        }
        if (table === 'inventory_items') {
          return {
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockImplementation(() => {
              return Promise.resolve({ data: mockInventoryItemsData, error: mockInventoryItemsError });
            })
          };
        }
        if (table === 'holidays') {
          return {
            select: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            single: vi.fn().mockImplementation(() => {
              if (mockHolidaysError) {
                return Promise.resolve({ data: null, error: mockHolidaysError });
              }
              return Promise.resolve({ data: mockHolidaysData, error: null });
            })
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
        };
      })
    }))
  };
});

// Mock environment variables
const originalEnv = process.env;

// Import the actions under test after mocking is set up
import {
  fetchTodayShifts,
  fetchWeatherForecast,
  fetchNextHoliday,
  compileDailyReportPayload
} from '@/app/actions/daily-report-actions';

describe('Daily LINE Notification Protocol Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-26T10:00:00+07:00'));
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test_key',
      SUPABASE_SERVICE_ROLE_KEY: 'test_service_role_key',
      OPENWEATHER_API_KEY: 'weather_key'
    };

    // Reset mock data
    mockProfilesData = [];
    mockShiftsData = [];
    mockInventoryItemsData = [];
    mockHolidaysData = null;
    mockProfilesError = null;
    mockShiftsError = null;
    mockInventoryItemsError = null;
    mockHolidaysError = null;
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env = originalEnv;
  });

  describe('fetchTodayShifts()', () => {
    it('should dynamically load profiles and classify them into active and off blocks', async () => {
      mockProfilesData = [
        { id: 'p1', full_name: 'นิต้า', schedule_order: 1 },
        { id: 'p2', full_name: 'ปิ่น', schedule_order: 2 },
        { id: 'p3', full_name: 'มุก', schedule_order: 3 },
        { id: 'p4', full_name: 'โบ๊ท', schedule_order: 4 },
      ];

      mockShiftsData = [
        { employee_id: 'p1', status: 'active', metadata: { location: 'เข้ากะ 8:00' } },
        { employee_id: 'p2', status: 'active', metadata: { location: 'เข้ากะ 6:30' } },
        { employee_id: 'p3', status: 'on_leave', metadata: { location: 'ลา' } },
        // p4 has no shift record
      ];

      const result = await fetchTodayShifts(new Date('2026-05-26'));

      // Active block should only have p1 and p2, sorted chronologically: 6:30 before 8:00
      expect(result.activeStaff).toHaveLength(2);
      expect(result.activeStaff[0]).toEqual({ name: 'ปิ่น', shiftText: '6:30' });
      expect(result.activeStaff[1]).toEqual({ name: 'นิต้า', shiftText: '8:00' });

      // Off block should have p3 (ลา) and p4 (วันหยุด - defaulted)
      expect(result.offStaff).toHaveLength(2);
      expect(result.offStaff[0]).toEqual({ name: 'มุก', shiftText: 'ลา' });
      expect(result.offStaff[1]).toEqual({ name: 'โบ๊ท', shiftText: 'วันหยุด' });

      // Headcount should reflect only active staff
      expect(result.headcount).toBe(2);
    });

    it('should strip prefix "เข้ากะ" and handle blank/empty shift fields as "วันหยุด"', async () => {
      mockProfilesData = [
        { id: 'p1', full_name: 'นิต้า', schedule_order: 1 },
        { id: 'p2', full_name: 'ปิ่น', schedule_order: 2 },
        { id: 'p3', full_name: 'มุก', schedule_order: 3 },
      ];

      mockShiftsData = [
        { employee_id: 'p1', status: 'active', metadata: { location: 'เข้ากะ   ' } }, // Blank location
        { employee_id: 'p2', status: 'active', metadata: { location: null } },       // Null location
        { employee_id: 'p3', status: 'active', metadata: {} },                        // Empty metadata object
      ];

      const result = await fetchTodayShifts(new Date('2026-05-26'));

      expect(result.activeStaff).toHaveLength(0);
      expect(result.offStaff).toHaveLength(3);
      expect(result.offStaff[0]).toEqual({ name: 'นิต้า', shiftText: 'วันหยุด' });
      expect(result.offStaff[1]).toEqual({ name: 'ปิ่น', shiftText: 'วันหยุด' });
      expect(result.offStaff[2]).toEqual({ name: 'มุก', shiftText: 'วันหยุด' });
      expect(result.headcount).toBe(0);
    });

    it('should fallback gracefully on DB error', async () => {
      mockProfilesError = new Error('Database connection failed');

      const result = await fetchTodayShifts(new Date('2026-05-26'));
      expect(result).toEqual({ activeStaff: [], offStaff: [], headcount: 0 });
    });

    it('should normalize legacy "ไม่มีกะ" to day-off status', async () => {
      mockProfilesData = [{ id: 'p1', full_name: 'หนูดี', schedule_order: 1 }];
      mockShiftsData = [
        { employee_id: 'p1', status: 'active', metadata: { location: 'ไม่มีกะ' } },
      ];

      const result = await fetchTodayShifts(new Date('2026-05-26'));
      expect(result.offStaff[0]).toEqual({ name: 'หนูดี', shiftText: 'วันหยุด' });
    });
  });

  describe('compileDailyReportPayload() staff formatting', () => {
    it('should use DD-MM-YYYY header and group day-off staff with Thai "และ"', async () => {
      mockProfilesData = [
        { id: 'p1', full_name: 'ปิ่น', schedule_order: 1 },
        { id: 'p2', full_name: 'หนูดี', schedule_order: 2 },
        { id: 'p3', full_name: 'ฟิว', schedule_order: 3 },
        { id: 'p4', full_name: 'มุก', schedule_order: 4 },
      ];
      mockShiftsData = [
        { employee_id: 'p1', status: 'active', metadata: { location: 'เข้ากะ 6:30' } },
        { employee_id: 'p4', status: 'on_leave', metadata: { location: 'ลา' } },
      ];

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ list: [] }),
      } as Response);
      mockHolidaysData = null;

      const payload = await compileDailyReportPayload();
      const today = toZonedTime(new Date(), 'Asia/Bangkok');
      const expectedDate = format(today, 'dd-MM-yyyy');

      expect(payload).toMatch(new RegExp(`รายงานสรุปประจำวันที่ ${expectedDate.replace(/-/g, '\\-')}`));
      expect(payload).toContain('- ปิ่น (6:30)');
      expect(payload).toContain('- หนูดี (วันหยุด)');
      expect(payload).toContain('- ฟิว (วันหยุด)');
      expect(payload).toContain('- มุก (ลา)');
      expect(payload).not.toContain('ไม่มีกะ');
    });
  });


  describe('fetchWeatherForecast()', () => {
    const mockSuccessResponse = (list: any[]) => {
      return {
        ok: true,
        json: async () => ({ list })
      } as Response;
    };

    it('should return "สภาพอากาศปกติ" if API key is missing', async () => {
      delete process.env.OPENWEATHER_API_KEY;
      const result = await fetchWeatherForecast();
      expect(result.summary).toBe('สภาพอากาศปกติ');
      expect(result.maxPop).toBe(0);
      expect(result.warningPeriods).toHaveLength(0);
    });

    it('should parse working hour rain forecasts and identify peak periods', async () => {
      const mockList = [
        // Out of working hours (03:00 ICT)
        { dt: Math.floor(new Date('2026-05-26T03:00:00+07:00').getTime() / 1000), pop: 0.8 },
        // Working hours (09:00 ICT)
        { dt: Math.floor(new Date('2026-05-26T09:00:00+07:00').getTime() / 1000), pop: 0.6, weather: [{ main: 'Rain', description: 'ฝนตกเล็กน้อย' }] },
        // Working hours (15:00 ICT)
        { dt: Math.floor(new Date('2026-05-26T15:00:00+07:00').getTime() / 1000), pop: 0.4, weather: [{ main: 'Clouds', description: 'เมฆมาก' }] },
        // Out of working hours (21:00 ICT)
        { dt: Math.floor(new Date('2026-05-26T21:00:00+07:00').getTime() / 1000), pop: 0.9 }
      ];

      vi.spyOn(global, 'fetch').mockResolvedValue(mockSuccessResponse(mockList));

      const result = await fetchWeatherForecast();
      expect(result.maxPop).toBe(60); // 0.6 * 100
      expect(result.summary).toBe('มีโอกาสฝนตกในช่วงเวลาทำงาน'); // maxPop >= 50%
      expect(result.warningPeriods).toHaveLength(1);
      expect(result.warningPeriods[0]).toContain('9:00-12:00 น. (โอกาสฝน 60%)');
    });

    it('should alert severe storms when thunderstorm or squall conditions are forecasted', async () => {
      const mockList = [
        {
          dt: Math.floor(new Date('2026-05-26T12:00:00+07:00').getTime() / 1000),
          pop: 0.85,
          weather: [{ main: 'Thunderstorm', description: 'พายุฝนฟ้าคะนอง' }]
        }
      ];

      vi.spyOn(global, 'fetch').mockResolvedValue(mockSuccessResponse(mockList));

      const result = await fetchWeatherForecast();
      expect(result.maxPop).toBe(85);
      expect(result.summary).toBe('พายุฝนฟ้าคะนอง'); // Severe weather description takes precedence
    });

    it('should return "สภาพอากาศปกติ" if response is not ok or fetches error out', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false } as Response);

      const result = await fetchWeatherForecast();
      expect(result.summary).toBe('สภาพอากาศปกติ');
      expect(result.maxPop).toBe(0);
    });
  });

  describe('fetchNextHoliday()', () => {
    it('should calculate the difference in days correctly', async () => {
      mockHolidaysData = { name: 'วันวิสาขบูชา', date: '2026-06-01' };

      const targetDate = new Date('2026-05-26');
      const result = await fetchNextHoliday(targetDate);

      expect(result).toEqual({ name: 'วันวิสาขบูชา', daysRemaining: 6, ok: true });
    });

    it('should return null if no holiday is returned', async () => {
      mockHolidaysData = null;

      const result = await fetchNextHoliday(new Date('2026-05-26'));
      expect(result).toBeNull();
    });
  });

  describe('Strategic Advice Threshold & Message Verification', () => {
    it('should compile complete daily report with correct advisory tiers and holiday warnings', async () => {
      // Mock Profile and Shifts
      mockProfilesData = [{ id: 'p1', full_name: 'ปิ่น', schedule_order: 1 }];
      mockShiftsData = [{ employee_id: 'p1', status: 'active', metadata: { location: 'เข้ากะ 6:30' } }];

      // Mock Inventory (No critical items)
      mockInventoryItemsData = [{ name: 'เมล็ดกาแฟ House Blend', stock: 10, order_point: 5 }];

      // Mock Weather (Normal)
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ list: [] })
      } as Response);

      const now = new Date();
      const today = toZonedTime(now, 'Asia/Bangkok');

      const getRelativeDateStr = (daysAhead: number) => {
        const target = new Date(today);
        target.setDate(target.getDate() + daysAhead);
        return format(target, 'yyyy-MM-dd');
      };

      // Scenario A: Holiday Today (Tier 0)
      mockHolidaysData = { name: 'วันวิสาขบูชา', date: getRelativeDateStr(0) };
      const payloadA = await compileDailyReportPayload();
      expect(payloadA).toContain('🔴 วันนี้เป็นวันหยุดนักขัตฤกษ์ (วันวิสาขบูชา)');

      // Scenario B: Urgent Pre-Holiday (Tier 1-3)
      mockHolidaysData = { name: 'วันวิสาขบูชา', date: getRelativeDateStr(2) };
      const payloadB = await compileDailyReportPayload();
      expect(payloadB).toContain('🟠 เหลืออีก 2 วันถึง วันวิสาขบูชา — เร่งตรวจสอบสต็อกวัตถุดิบหลัก แก้ว ฝา หลอด');

      // Scenario C: Advance Warning (Tier 4-7)
      mockHolidaysData = { name: 'วันวิสาขบูชา', date: getRelativeDateStr(6) };
      const payloadC = await compileDailyReportPayload();
      expect(payloadC).toContain('แนะนำให้เริ่มตรวจสอบปริมาณสต็อกคงคลังและวางแผนสั่งซื้อล่วงหน้า');

      // Scenario D: Normal Status (> 7 Days)
      mockHolidaysData = { name: 'วันวิสาขบูชา', date: getRelativeDateStr(15) };
      const payloadD = await compileDailyReportPayload();
      expect(payloadD).toContain('สถานการณ์ปกติ ลุยงานกันเลย!');
    });
  });
});


