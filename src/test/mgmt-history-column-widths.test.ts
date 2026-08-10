import { describe, expect, test } from 'vitest';
import {
  computeMgmtHistoryColumnWidths,
  formatMgmtHistoryDateRange,
  sumMgmtHistoryColumnWidthsPx,
  type MgmtHistoryColumnInput,
} from '@/lib/schedule/mgmt-history-column-widths';

const columns: MgmtHistoryColumnInput[] = [
  { id: 'employee_name', label: 'พนักงาน' },
  { id: 'date_range', label: 'วันที่' },
  { id: 'shift_type', label: 'ประเภท' },
  { id: 'remark', label: 'หมายเหตุ' },
  { id: 'actions', label: 'จัดการ' },
];

describe('computeMgmtHistoryColumnWidths', () => {
  test('sizes columns from the longest row value within min/max bounds', () => {
    const widths = computeMgmtHistoryColumnWidths(columns, [
      {
        employeeName: 'สมชาย',
        dateRange: '01/08/2026',
        shiftTypeLabel: 'ลา',
        remark: '-',
      },
      {
        employeeName: 'นางสาวพิมพ์ชนก วงศ์สุวรรณ',
        dateRange: '1-5/8/2026',
        shiftTypeLabel: 'เปลี่ยนกะ 14:00',
        remark: 'ไปธุระที่กรุงเทพฯ',
      },
    ]);

    expect(widths.employee_name).toBeGreaterThanOrEqual(80);
    expect(widths.employee_name).toBeLessThanOrEqual(196);
    expect(widths.date_range).toBeGreaterThan(widths.employee_name * 0.5);
    expect(widths.shift_type).toBeGreaterThan(76);
    expect(widths.remark).toBeGreaterThanOrEqual(40);
    expect(widths.actions).toBe(96);
  });

  test('uses header labels when history is empty', () => {
    const widths = computeMgmtHistoryColumnWidths(columns, []);

    expect(widths.employee_name).toBeGreaterThanOrEqual(80);
    expect(widths.date_range).toBeGreaterThanOrEqual(96);
    expect(widths.shift_type).toBeGreaterThanOrEqual(76);
    expect(widths.remark).toBeGreaterThanOrEqual(40);
  });

  test('caps very long remarks so the table does not become excessively wide', () => {
    const widths = computeMgmtHistoryColumnWidths(columns, [
      {
        employeeName: 'A',
        dateRange: '01/08/2026',
        shiftTypeLabel: 'ลา',
        remark: 'x'.repeat(200),
      },
    ]);

    expect(widths.remark).toBeLessThanOrEqual(160);
  });

  test('keeps remark column tight for short placeholder text', () => {
    const widths = computeMgmtHistoryColumnWidths(columns, [
      {
        employeeName: 'A',
        dateRange: '1/8/2026',
        shiftTypeLabel: 'ลา',
        remark: '-',
      },
    ]);

    expect(widths.remark).toBeLessThan(100);
  });
});

describe('formatMgmtHistoryDateRange', () => {
  test('shows a single date without leading zeros when start and end are the same day', () => {
    expect(formatMgmtHistoryDateRange('2026-08-01T09:00:00', '2026-08-01T18:00:00')).toBe(
      '1/8/2026',
    );
  });

  test('shows a compact same-month range', () => {
    expect(formatMgmtHistoryDateRange('2026-05-27T09:00:00', '2026-05-29T18:00:00')).toBe(
      '27-29/5/2026',
    );
  });

  test('shows cross-month ranges on two lines', () => {
    expect(formatMgmtHistoryDateRange('2026-05-30T09:00:00', '2026-06-01T18:00:00')).toBe(
      '30/5/2026 → \n1/6/2026',
    );
  });
});
