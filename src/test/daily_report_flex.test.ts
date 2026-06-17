import { describe, it, expect } from 'vitest';
import type { DailyReportData } from '@/app/actions/daily-report-actions';
import {
  buildDailyReportFlexMessage,
  shouldShowHolidayFooter,
  HOLIDAY_FOOTER_MAX_DAYS,
  DAILY_REPORT_BUBBLE_SIZE,
} from '@/lib/line/daily-report-flex';

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

describe('buildDailyReportFlexMessage()', () => {
  it('returns a compact flex message with altText and bubble layout', () => {
    const message = buildDailyReportFlexMessage(sampleData);

    expect(message.type).toBe('flex');
    expect(message.altText).toContain('13-06-2026');
    expect(message.altText).toContain('พรุ่งนี้');
    expect(message.contents.type).toBe('bubble');
    expect(message.contents.size).toBe(DAILY_REPORT_BUBBLE_SIZE);
  });

  it('omits Bru AI branding and headcount duplicate line', () => {
    const message = buildDailyReportFlexMessage(sampleData);
    const json = JSON.stringify(message);

    expect(json).not.toContain('Bru AI');
    expect(json).not.toContain('เข้ากะ');
    expect(json).not.toContain('ไม่เข้ากะ');
  });

  it('shows working count in section title', () => {
    const message = buildDailyReportFlexMessage(sampleData);
    const body = JSON.stringify(message.contents.body);

    expect(body).toContain('เข้างาน');
    expect(body).toContain('2 คน');
  });

  it('uses shift pastel colors from shift-colors palette', () => {
    const message = buildDailyReportFlexMessage(sampleData);
    const body = JSON.stringify(message.contents.body);

    expect(body).toContain('#d4edda');
    expect(body).toContain('#ffffff');
    expect(body).toContain('#f8d7da');
    expect(body).toContain('#d1ecf1');
  });

  it('lists other-duty staff inside working section below timed shifts', () => {
    const message = buildDailyReportFlexMessage(sampleData);
    const body = JSON.stringify(message.contents.body);
    const pinIndex = body.indexOf('ปิ่น');
    const laIndex = body.indexOf('ล่า');
    const nitaIndex = body.indexOf('นิต้า');

    expect(pinIndex).toBeGreaterThan(-1);
    expect(laIndex).toBeGreaterThan(pinIndex);
    expect(nitaIndex).toBeGreaterThan(laIndex);
  });

  it('omits holiday footer when next holiday is more than 14 days away', () => {
    const message = buildDailyReportFlexMessage(sampleData);

    expect(message.contents.footer).toBeUndefined();
    expect(JSON.stringify(message)).not.toContain('วันหยุดนักขัตฤกษ์');
  });

  it('renders holiday footer only within 14 days', () => {
    const message = buildDailyReportFlexMessage({
      ...sampleData,
      holiday: { name: 'วันเฉลิมพระชนมพรรษา', daysRemaining: 10 },
    });
    const footerText = JSON.stringify(message.contents.footer);

    expect(footerText).toContain('วันหยุดนักขัตฤกษ์');
    expect(footerText).toContain('อีก 10 วัน');
    expect(footerText).toContain('#fff3cd');
  });

  it('labels today schedule in header', () => {
    const message = buildDailyReportFlexMessage({
      ...sampleData,
      schedule: 'today',
    });
    const headerText = JSON.stringify(message.contents.header);

    expect(headerText).toContain('วันนี้');
  });
});

describe('shouldShowHolidayFooter()', () => {
  it(`shows footer at ${HOLIDAY_FOOTER_MAX_DAYS} days or less`, () => {
    expect(shouldShowHolidayFooter({ name: 'Test', daysRemaining: 14 })).toBe(true);
    expect(shouldShowHolidayFooter({ name: 'Test', daysRemaining: 15 })).toBe(false);
    expect(shouldShowHolidayFooter(null)).toBe(false);
  });
});
