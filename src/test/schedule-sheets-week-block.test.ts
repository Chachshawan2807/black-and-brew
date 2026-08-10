import { describe, expect, test } from 'vitest';
import {
  buildMonthlySheetTabSearchOrder,
  parseMonthlySheetTabMonthYear,
} from '@/lib/schedule/sheets-month-tab';
import {
  deriveWeekBlockLayout,
  findWeekBlockDateRow,
  findWeekBlockInSheet,
  mapWeekValuesToSheetColumns,
  resolveIsoDatesFromSheetDateRow,
  weekDayNumbersFromIsoDates,
} from '@/lib/schedule/sheets-week-block';
import { sheetDayLabelMatchesWeekday, thaiDayLabelToWeekday } from '@/lib/schedule/sheets-day-labels';

describe('sheets-month-tab viewed date priority', () => {
  test('buildMonthlySheetTabSearchOrder prefers viewed month before Monday month', () => {
    const titles = ['ตารางงานเดือน ก.ค. 69', 'ตารางงานเดือน ส.ค. 69'];
    expect(
      buildMonthlySheetTabSearchOrder(titles, '2026-07-27', '2026-08-02', '2026-08-02'),
    ).toEqual(['ตารางงานเดือน ส.ค. 69', 'ตารางงานเดือน ก.ค. 69']);
  });

  test('parseMonthlySheetTabMonthYear reads tab month/year', () => {
    expect(parseMonthlySheetTabMonthYear('ตารางงานเดือน ส.ค. 69')).toEqual({
      month: 7,
      year: 2026,
    });
  });
});

describe('resolveIsoDatesFromSheetDateRow', () => {
  test('handles month rollover within a week row', () => {
    const resolved = resolveIsoDatesFromSheetDateRow(
      [27, 28, 29, 30, 31, 1, 2],
      6,
      2026,
    );
    expect(resolved).toEqual([
      '2026-07-27',
      '2026-07-28',
      '2026-07-29',
      '2026-07-30',
      '2026-07-31',
      '2026-08-01',
      '2026-08-02',
    ]);
  });
});

describe('findWeekBlockInSheet', () => {
  const weekDays = [
    '2026-07-27',
    '2026-07-28',
    '2026-07-29',
    '2026-07-30',
    '2026-07-31',
    '2026-08-01',
    '2026-08-02',
  ];

  test('skips empty top rows and matches dates plus day labels', () => {
    const grid = [
      ['', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['27', '28', '29', '30', '31', '1', '2'],
      ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'],
    ];

    const match = findWeekBlockInSheet(grid, weekDays, 6, 2026);
    expect(match?.dateRow).toBe(3);
    expect(match?.columnMap).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(match?.sheetDayLabels).toEqual(['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.']);
  });

  test('matches mixed label spellings on the same week row', () => {
    const grid = [
      ['27', '28', '29', '30', '31', '1', '2'],
      ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'],
    ];

    const match = findWeekBlockInSheet(grid, weekDays, 6, 2026);
    expect(match?.dateRow).toBe(1);
  });

  test('matches when labels use spaces, extra dots, or Saturday variants', () => {
    const grid = [
      ['27', '28', '29', '30', '31', '1', '2'],
      ['จ ', 'อ..', 'พ.', 'พฤหัส', 'ศุก', 'เสาร', 'อาทิต'],
    ];

    const match = findWeekBlockInSheet(grid, weekDays, 6, 2026);
    expect(match?.dateRow).toBe(1);
  });

  test('still matches when label row has unrecognised tokens but dates align', () => {
    const grid = [
      ['27', '28', '29', '30', '31', '1', '2'],
      ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', '???'],
    ];

    const match = findWeekBlockInSheet(grid, weekDays, 6, 2026);
    expect(match?.dateRow).toBe(1);
  });

  test('findWeekBlockDateRow still locates day-number rows', () => {
    const grid = [
      ['7', '8', '9', '10', '11', '12', '13'],
      ['', '', '', '', '', '', ''],
      ['27', '28', '29', '30', '31', '1', '2'],
    ];
    const row = findWeekBlockDateRow(grid, weekDayNumbersFromIsoDates(weekDays));
    expect(row).toBe(3);
    expect(deriveWeekBlockLayout(row!).frontStoreShiftRows['6:30']).toBe(5);
  });
});

describe('mapWeekValuesToSheetColumns', () => {
  test('places Monday-first website values into mapped columns', () => {
    const mapped = mapWeekValuesToSheetColumns(['A', 'B', 'C', 'D', 'E', 'F', 'G'], [0, 1, 2, 3, 4, 5, 6]);
    expect(mapped).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  });
});

describe('thaiDayLabelToWeekday', () => {
  test('matches abbreviated and dotted labels', () => {
    expect(thaiDayLabelToWeekday('จ.')).toBe(1);
    expect(thaiDayLabelToWeekday('อา.')).toBe(0);
    expect(thaiDayLabelToWeekday('เสาร์')).toBe(6);
    expect(thaiDayLabelToWeekday('พฤหัส')).toBe(4);
    expect(thaiDayLabelToWeekday('พ')).toBe(3);
    expect(thaiDayLabelToWeekday('Mon')).toBe(1);
  });

  test('sheetDayLabelMatchesWeekday tolerates unknown spellings', () => {
    expect(sheetDayLabelMatchesWeekday('???', 1)).toBe(true);
    expect(sheetDayLabelMatchesWeekday('เสาร', 6)).toBe(true);
    expect(sheetDayLabelMatchesWeekday('จ.', 0)).toBe(false);
  });
});
