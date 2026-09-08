import { describe, expect, it } from 'vitest';
import type { DailyReportData } from '@/app/actions/daily-report-actions';
import {
  buildDailyReportAltText,
  filterNotificationLeaveStaff,
  formatDailyReportHistoryDetailLines,
  formatDailyReportHistoryHeadline,
  HOLIDAY_SUMMARY_MAX_DAYS,
  isDayOffShiftText,
  shouldIncludeHolidaySummary,
} from '@/lib/daily-report-summary';

const sampleData: DailyReportData = {
  schedule: 'tomorrow',
  dateStr: '13/06/2026',
  headcount: 2,
  activeStaff: [
    { name: 'ปิ่น', shiftText: '6:30' },
    { name: 'มุก', shiftText: '7:00' },
  ],
  otherDutyStaff: [{ name: 'ล่า', shiftText: 'ร้านซักผ้า' }],
  offStaff: [
    { name: 'นิต้า', shiftText: 'วันหยุด' },
    { name: 'มุก', shiftText: 'ลา' },
  ],
  holiday: { name: 'วันเฉลิมพระชนมพรรษา', daysRemaining: 46 },
};

describe('buildDailyReportAltText()', () => {
  it('builds a multi-line daily report summary for notifications', () => {
    const summary = buildDailyReportAltText(sampleData);
    const lines = summary.split('\n');

    expect(lines[0]).toBe('ตารางงาน 13/06/2026 ส. (พรุ่งนี้) · เข้างาน 2 คน');
    expect(lines[1]).toBe('ปิ่น 6:30, มุก 7:00');
    expect(lines[2]).toBe('งานอื่น: ล่า ร้านซักผ้า');
    expect(lines[3]).toBe('ลา: มุก');
    expect(summary).not.toContain('มุก (ลา)');
    expect(summary).not.toContain('นิต้า');
    expect(summary).not.toContain('หยุด:');
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

describe('filterNotificationLeaveStaff()', () => {
  it('keeps only leave shifts and drops day-off entries', () => {
    const filtered = filterNotificationLeaveStaff([
      { name: 'มุก', shiftText: 'ลา' },
      { name: 'โบ๊ท', shiftText: 'วันหยุด' },
      { name: 'นิต้า', shiftText: 'วันหยุด' },
    ]);

    expect(filtered).toEqual([{ name: 'มุก', shiftText: 'ลา' }]);
  });
});

describe('isDayOffShiftText()', () => {
  it('identifies normalized day-off labels', () => {
    expect(isDayOffShiftText('วันหยุด')).toBe(true);
    expect(isDayOffShiftText('ลา')).toBe(false);
  });
});

describe('shouldIncludeHolidaySummary()', () => {
  it(`includes holidays at ${HOLIDAY_SUMMARY_MAX_DAYS} days or less`, () => {
    expect(shouldIncludeHolidaySummary({ name: 'Test', daysRemaining: 14 })).toBe(true);
    expect(shouldIncludeHolidaySummary({ name: 'Test', daysRemaining: 15 })).toBe(false);
    expect(shouldIncludeHolidaySummary(null)).toBe(false);
  });
});

describe('daily report edit history display', () => {
  it('formats readable Thai lines from stored snapshot', () => {
    const lines = formatDailyReportHistoryDetailLines(
      {
        entity_type: 'daily_report',
        metadata: { kind: 'daily_report', title: 'ตารางงานพรุ่งนี้' },
        new_value: sampleData,
      },
      true,
    );

    expect(lines).toEqual([
      'ตารางงาน 13/06/2026 ส. (พรุ่งนี้) · เข้างาน 2 คน',
      'ปิ่น 6:30, มุก 7:00',
      'งานอื่น: ล่า ร้านซักผ้า',
      'ลา: มุก',
    ]);
    expect(lines?.join(' ')).not.toContain('activeStaff');
    expect(lines?.join(' ')).not.toContain('shiftText');
    expect(lines?.join(' ')).not.toContain('tomorrow');
  });

  it('uses metadata title for headline', () => {
    expect(
      formatDailyReportHistoryHeadline(
        {
          entity_label: '09/09/2026 พ.',
          metadata: { title: 'ตารางงานพรุ่งนี้' },
          new_value: sampleData,
        },
        true,
      ),
    ).toBe('ตารางงานพรุ่งนี้');
  });
});
