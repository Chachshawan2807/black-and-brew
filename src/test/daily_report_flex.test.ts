import { describe, it, expect } from 'vitest';
import type { DailyReportData } from '@/app/actions/daily-report-actions';
import { buildDailyReportFlexMessage } from '@/lib/line/daily-report-flex';

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
  it('returns a flex message with altText and bubble layout', () => {
    const message = buildDailyReportFlexMessage(sampleData);

    expect(message.type).toBe('flex');
    expect(message.altText).toContain('13-06-2026');
    expect(message.altText).toContain('พรุ่งนี้');
    expect(message.contents.type).toBe('bubble');
    expect(message.contents.size).toBe('mega');
  });

  it('uses shift pastel colors from shift-colors palette', () => {
    const message = buildDailyReportFlexMessage(sampleData);
    const body = JSON.stringify(message.contents.body);

    expect(body).toContain('#d4edda');
    expect(body).toContain('#ffffff');
    expect(body).toContain('#f8d7da');
    expect(body).toContain('#d1ecf1');
    expect(body).toContain('เข้างาน');
    expect(body).not.toContain('ไม่เข้ากะ / งานอื่น');
  });

  it('lists other-duty staff inside เข้างาน below timed shifts', () => {
    const message = buildDailyReportFlexMessage(sampleData);
    const body = JSON.stringify(message.contents.body);
    const pinIndex = body.indexOf('ปิ่น');
    const laIndex = body.indexOf('ล่า');
    const nitaIndex = body.indexOf('นิต้า');

    expect(pinIndex).toBeGreaterThan(-1);
    expect(laIndex).toBeGreaterThan(pinIndex);
    expect(nitaIndex).toBeGreaterThan(laIndex);
  });

  it('renders holiday footer with countdown', () => {
    const message = buildDailyReportFlexMessage(sampleData);
    const footerText = JSON.stringify(message.contents.footer);

    expect(footerText).toContain('วันหยุดนักขัตฤกษ์ถัดไป');
    expect(footerText).toContain('อีก 46 วัน');
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
