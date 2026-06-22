import { describe, expect, it } from 'vitest';
import type { DailyReportData } from '@/app/actions/daily-report-actions';
import {
  buildDailyReportAltText,
  HOLIDAY_SUMMARY_MAX_DAYS,
  shouldIncludeHolidaySummary,
} from '@/lib/daily-report-summary';

const sampleData: DailyReportData = {
  schedule: 'tomorrow',
  dateStr: '13-06-2026',
  headcount: 2,
  activeStaff: [
    { name: 'ปิ่น', shiftText: '6:30' },
    { name: 'มุก', shiftText: '7:00' },
  ],
  otherDutyStaff: [{ name: 'ล่า', shiftText: 'ร้านซักผ้า' }],
  offStaff: [{ name: 'นิต้า', shiftText: 'วันหยุด' }],
  holiday: { name: 'วันเฉลิมพระชนมพรรษา', daysRemaining: 46 },
};

describe('buildDailyReportAltText()', () => {
  it('builds a compact daily report summary for Web Push previews', () => {
    const summary = buildDailyReportAltText(sampleData);

    expect(summary).toContain('ตารางงาน 13-06-2026 (พรุ่งนี้)');
    expect(summary).toContain('เข้างาน 2 คน');
    expect(summary).toContain('ปิ่น 6:30');
    expect(summary).toContain('งานอื่น: ล่า (ร้านซักผ้า)');
    expect(summary).toContain('หยุด: นิต้า (วันหยุด)');
  });

  it('includes only nearby holidays', () => {
    const farHoliday = buildDailyReportAltText(sampleData);
    const nearbyHoliday = buildDailyReportAltText({
      ...sampleData,
      holiday: { name: 'วันเฉลิมพระชนมพรรษา', daysRemaining: 10 },
    });

    expect(farHoliday).not.toContain('วันหยุด:');
    expect(nearbyHoliday).toContain('วันหยุด: วันเฉลิมพระชนมพรรษา (อีก 10 วัน)');
  });

  it('labels today schedules correctly', () => {
    const summary = buildDailyReportAltText({
      ...sampleData,
      schedule: 'today',
    });

    expect(summary).toContain('(วันนี้)');
  });
});

describe('shouldIncludeHolidaySummary()', () => {
  it(`includes holidays at ${HOLIDAY_SUMMARY_MAX_DAYS} days or less`, () => {
    expect(shouldIncludeHolidaySummary({ name: 'Test', daysRemaining: 14 })).toBe(true);
    expect(shouldIncludeHolidaySummary({ name: 'Test', daysRemaining: 15 })).toBe(false);
    expect(shouldIncludeHolidaySummary(null)).toBe(false);
  });
});
