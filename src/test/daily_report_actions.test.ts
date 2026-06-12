import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toZonedTime } from 'date-fns-tz';
import { addDays, format } from 'date-fns';


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
  fetchNextHoliday,
  compileDailyReportData,
  resolveDailyReportSchedule,
} from '@/app/actions/daily-report-actions';
import { buildDailyReportAltText } from '@/lib/line/daily-report-flex';

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
      expect(result).toEqual({
        activeStaff: [],
        otherDutyStaff: [],
        offStaff: [],
        headcount: 0,
      });
    });

    it('should classify other-duty staff separately and exclude from headcount', async () => {
      mockProfilesData = [
        { id: 'p1', full_name: 'ปิ่น', schedule_order: 1 },
        { id: 'p2', full_name: 'ล่า', schedule_order: 8 },
        { id: 'p3', full_name: 'นิต้า', schedule_order: 2 },
      ];
      mockShiftsData = [
        { employee_id: 'p1', status: 'active', metadata: { location: 'เข้ากะ 6:30' } },
        { employee_id: 'p2', status: 'active', metadata: { location: 'ร้านซักผ้า' } },
        { employee_id: 'p3', status: 'active', metadata: { location: 'วันหยุด' } },
      ];

      const result = await fetchTodayShifts(new Date('2026-05-26'));

      expect(result.activeStaff).toEqual([{ name: 'ปิ่น', shiftText: '6:30' }]);
      expect(result.otherDutyStaff).toEqual([{ name: 'ล่า', shiftText: 'ร้านซักผ้า' }]);
      expect(result.offStaff).toEqual([{ name: 'นิต้า', shiftText: 'วันหยุด' }]);
      expect(result.headcount).toBe(1);
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

  describe('compileDailyReportData() staff formatting', () => {
    it('should use DD-MM-YYYY date and normalize day-off staff labels', async () => {
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

      const data = await compileDailyReportData();
      const today = toZonedTime(new Date(), 'Asia/Bangkok');
      const expectedDate = format(today, 'dd-MM-yyyy');
      const altText = buildDailyReportAltText(data);

      expect(data.dateStr).toBe(expectedDate);
      expect(data.activeStaff).toContainEqual({ name: 'ปิ่น', shiftText: '6:30' });
      expect(data.offStaff).toContainEqual({ name: 'หนูดี', shiftText: 'วันหยุด' });
      expect(data.offStaff).toContainEqual({ name: 'ฟิว', shiftText: 'วันหยุด' });
      expect(data.offStaff).toContainEqual({ name: 'มุก', shiftText: 'ลา' });
      expect(altText).toContain(expectedDate);
      expect(altText).toContain('ปิ่น 6:30');
      expect(altText).not.toContain('ไม่มีกะ');
    });

    it('should compile tomorrow schedule when schedule=tomorrow (18:00 ICT cron)', async () => {
      mockProfilesData = [{ id: 'p1', full_name: 'ปิ่น', schedule_order: 1 }];
      mockShiftsData = [{ employee_id: 'p1', status: 'active', metadata: { location: 'เข้ากะ 6:30' } }];

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ list: [] }),
      } as Response);
      mockHolidaysData = null;

      const data = await compileDailyReportData('tomorrow');
      const tomorrow = addDays(toZonedTime(new Date(), 'Asia/Bangkok'), 1);
      const expectedDate = format(tomorrow, 'dd-MM-yyyy');

      expect(data.dateStr).toBe(expectedDate);
      expect(data.schedule).toBe('tomorrow');
    });
  });


  describe('resolveDailyReportSchedule()', () => {
    it('returns tomorrow at 18:00 ICT when cron omits ?schedule=', () => {
      const at1800Ict = new Date('2026-06-12T11:00:00.000Z');
      expect(resolveDailyReportSchedule(null, at1800Ict)).toBe('tomorrow');
    });

    it('returns today at 05:00 ICT when cron omits ?schedule=', () => {
      const at0500Ict = new Date('2026-06-11T22:00:00.000Z');
      expect(resolveDailyReportSchedule(null, at0500Ict)).toBe('today');
    });

    it('honours explicit schedule=tomorrow before 18:00 ICT', () => {
      const at0500Ict = new Date('2026-06-11T22:00:00.000Z');
      expect(resolveDailyReportSchedule('tomorrow', at0500Ict)).toBe('tomorrow');
    });

    it('honours explicit schedule=today after 18:00 ICT', () => {
      const at1800Ict = new Date('2026-06-12T11:00:00.000Z');
      expect(resolveDailyReportSchedule('today', at1800Ict)).toBe('today');
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
    it('should compile daily report holiday section from fetchNextHoliday countdown', async () => {
      mockProfilesData = [{ id: 'p1', full_name: 'ปิ่น', schedule_order: 1 }];
      mockShiftsData = [{ employee_id: 'p1', status: 'active', metadata: { location: 'เข้ากะ 6:30' } }];

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

      // Scenario A: Holiday today (daysRemaining = 0)
      mockHolidaysData = { name: 'วันวิสาขบูชา', date: getRelativeDateStr(0) };
      const dataA = await compileDailyReportData();
      expect(dataA.holiday).toEqual({ name: 'วันวิสาขบูชา', daysRemaining: 0 });

      // Scenario B: Holiday in 2 days
      mockHolidaysData = { name: 'วันวิสาขบูชา', date: getRelativeDateStr(2) };
      const dataB = await compileDailyReportData();
      expect(dataB.holiday).toEqual({ name: 'วันวิสาขบูชา', daysRemaining: 2 });

      // Scenario C: Holiday in 6 days
      mockHolidaysData = { name: 'วันวิสาขบูชา', date: getRelativeDateStr(6) };
      const dataC = await compileDailyReportData();
      expect(dataC.holiday).toEqual({ name: 'วันวิสาขบูชา', daysRemaining: 6 });

      // Scenario D: Holiday in 15 days
      mockHolidaysData = { name: 'วันวิสาขบูชา', date: getRelativeDateStr(15) };
      const dataD = await compileDailyReportData();
      expect(dataD.holiday).toEqual({ name: 'วันวิสาขบูชา', daysRemaining: 15 });
    });
  });
});


