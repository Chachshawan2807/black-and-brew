import { describe, expect, test } from 'vitest';
import {
  BRU_REPORT_RULES,
  buildBruReport,
  ensureFemalePoliteness,
  formatIsoDateDisplay,
  stripForbiddenMarkdown,
} from '@/lib/agents/report-response';

describe('Bru report response style', () => {
  test('builds a short report with header, bullets, and female closing', () => {
    const text = buildBruReport({
      header: '📦 สรุปรายการสินค้าที่ต้องสั่งเติม',
      bullets: [
        'นมสด — สต็อก: 2 ลิตร | จุดสั่งซื้อ: 5 | แนะนำสั่ง: 10 ลิตร',
        'เมล็ดอาราบิก้า — สต็อก: 1 กก. | จุดสั่งซื้อ: 3 | แนะนำสั่ง: 5 กก.',
      ],
      footerCount: { label: 'รายการที่ต้องเติมสต็อก', count: 2 },
    });

    expect(text).toContain('📦 สรุปรายการสินค้าที่ต้องสั่งเติม');
    expect(text).toContain('- นมสด — สต็อก: 2 ลิตร');
    expect(text).toContain('รวม 2 รายการที่ต้องเติมสต็อกค่ะ');
    expect(text).not.toMatch(/ครับ|ผม/);
    expect(text.split('\n').length).toBeLessThanOrEqual(15);
  });

  test('empty case returns female polite empty message without bullets', () => {
    const text = buildBruReport({
      header: '📦 สรุปรายการสินค้าที่ต้องสั่งเติม',
      bullets: [],
      emptyMessage: 'สต็อกทุกรายการอยู่ในระดับปกติ ไม่มีรายการใดต้องสั่งเติมในขณะนี้',
    });

    expect(text).toBe(
      'สต็อกทุกรายการอยู่ในระดับปกติ ไม่มีรายการใดต้องสั่งเติมในขณะนี้ค่ะ',
    );
  });

  test('strips bold markdown and ensures ค่ะ ending', () => {
    expect(stripForbiddenMarkdown('**ห้ามหนา** และตาราง')).toBe('ห้ามหนา และตาราง');
    expect(ensureFemalePoliteness('สรุปเรียบร้อย')).toBe('สรุปเรียบร้อยค่ะ');
    expect(ensureFemalePoliteness('สรุปเรียบร้อยนะคะ')).toBe('สรุปเรียบร้อยนะคะ');
    expect(ensureFemalePoliteness('สรุปเรียบร้อยครับ')).toBe('สรุปเรียบร้อยค่ะ');
  });

  test('formats ISO dates as DD-MM-YYYY', () => {
    expect(formatIsoDateDisplay('2026-07-23')).toBe('23-07-2026');
  });

  test('exports shared rule constants for system prompt', () => {
    expect(BRU_REPORT_RULES).toContain('ค่ะ');
    expect(BRU_REPORT_RULES).toContain('ห้ามใช้ **');
    expect(BRU_REPORT_RULES).toContain('DD-MM-YYYY');
  });
});
