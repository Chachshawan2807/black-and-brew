import { describe, expect, test } from 'vitest';
import { buildMonthlySheetTabTitle, buildMonthlySheetTabSearchOrder, resolveMonthlySheetTabTitle } from '@/lib/schedule/sheets-month-tab';
import {
  deriveWeekBlockLayout,
  findWeekBlockDateRow,
  weekDayNumbersFromIsoDates,
} from '@/lib/schedule/sheets-week-block';
import {
  buildScheduleSheetsUpdates,
  buildFrontStoreShiftSubRows,
  mergeNamesIntoSlots,
} from '@/lib/schedule/sheets-week-layout';

const profiles = [
  { id: 'p1', full_name: 'มุก', schedule_order: 1 },
  { id: 'p2', full_name: 'ปิ่น', schedule_order: 2 },
  { id: 'p3', full_name: 'เม', schedule_order: 3 },
  { id: 'p4', full_name: 'ฟิว', schedule_order: 4 },
  { id: 'p5', full_name: 'ล่า', schedule_order: 5 },
  { id: 'p6', full_name: 'นิต้า', schedule_order: 6 },
  { id: 'p7', full_name: 'มีนา', schedule_order: 7 },
  { id: 'p8', full_name: 'หนูดี', schedule_order: 8 },
  { id: 'p9', full_name: 'ชัช', schedule_order: 9 },
];

describe('sheets-month-tab', () => {
  test('buildMonthlySheetTabTitle matches BAB monthly sheet naming', () => {
    expect(buildMonthlySheetTabTitle('2026-08-02')).toBe('ตารางงานเดือน ส.ค. 69');
    expect(buildMonthlySheetTabTitle('2026-07-27')).toBe('ตารางงานเดือน ก.ค. 69');
    expect(buildMonthlySheetTabTitle('2026-07-31')).toBe('ตารางงานเดือน ก.ค. 69');
  });

  test('resolveMonthlySheetTabTitle uses Monday month for cross-month weeks', () => {
    const titles = ['ตารางงานเดือน ก.ค. 69', 'ตารางงานเดือน ส.ค. 69'];
    expect(resolveMonthlySheetTabTitle(titles, '2026-07-27')).toBe('ตารางงานเดือน ก.ค. 69');
    expect(resolveMonthlySheetTabTitle(titles, '2026-08-03')).toBe('ตารางงานเดือน ส.ค. 69');
  });

  test('buildMonthlySheetTabSearchOrder scans viewed month then Monday then Sunday month', () => {
    const titles = ['ตารางงานเดือน ก.ค. 69', 'ตารางงานเดือน ส.ค. 69'];
    expect(
      buildMonthlySheetTabSearchOrder(titles, '2026-07-27', '2026-08-02', '2026-08-02'),
    ).toEqual(['ตารางงานเดือน ส.ค. 69', 'ตารางงานเดือน ก.ค. 69']);
    expect(buildMonthlySheetTabSearchOrder(titles, '2026-07-27', '2026-08-02')).toEqual([
      'ตารางงานเดือน ก.ค. 69',
      'ตารางงานเดือน ส.ค. 69',
    ]);
    expect(buildMonthlySheetTabSearchOrder(titles, '2026-08-03', '2026-08-09')).toEqual([
      'ตารางงานเดือน ส.ค. 69',
    ]);
  });
});

describe('sheets-week-block', () => {
  test('findWeekBlockDateRow locates matching week in branch-1 columns', () => {
    const grid = [
      ['7', '8', '9', '10', '11', '12', '13'],
      ['', '', '', '', '', '', ''],
      ['27', '28', '29', '30', '31', '1', '2'],
    ];
    const weekDays = ['2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02'];
    const row = findWeekBlockDateRow(grid, weekDayNumbersFromIsoDates(weekDays));
    expect(row).toBe(3);
    expect(deriveWeekBlockLayout(row!).frontStoreShiftRows['6:30']).toBe(5);
  });
});

describe('mergeNamesIntoSlots', () => {
  test('replaces existing slots top-down and clears leftovers', () => {
    expect(mergeNamesIntoSlots(['เม', 'มีนา', 'เก่า'], ['มีนา'])).toEqual(['มีนา', '', '']);
  });

  test('fills empty slots without appending into occupied cells', () => {
    expect(mergeNamesIntoSlots(['', ''], ['เม', 'มีนา'])).toEqual(['เม', 'มีนา']);
  });
});

describe('buildFrontStoreShiftSubRows', () => {
  test('places each employee on a separate row with name only', () => {
    const weekDays = ['2026-07-27', '2026-07-28'];
    const shifts = [
      {
        employee_id: 'p7',
        start_time: '2026-07-28T00:00:00',
        status: 'scheduled',
        metadata: { location: '7:00' },
      },
      {
        employee_id: 'p3',
        start_time: '2026-07-28T00:00:00',
        status: 'scheduled',
        metadata: { location: '7:00' },
      },
    ];

    const rows = buildFrontStoreShiftSubRows(weekDays, profiles, shifts, '7:00', 2);
    expect(rows).toEqual([
      ['', 'เม'],
      ['', 'มีนา'],
    ]);
  });
});

describe('buildScheduleSheetsUpdates', () => {
  test('writes employee names only in branch-1 day columns (no dates, labels, or counts)', () => {
    const weekStart = '2026-07-27';
    const shifts = [
      {
        employee_id: 'p2',
        start_time: '2026-07-27T00:00:00',
        status: 'scheduled',
        metadata: { location: '6:30' },
      },
      {
        employee_id: 'p6',
        start_time: '2026-07-27T00:00:00',
        status: 'scheduled',
        metadata: { location: '6:30' },
      },
      {
        employee_id: 'p1',
        start_time: '2026-07-27T00:00:00',
        status: 'scheduled',
        metadata: { location: '7:00' },
      },
      {
        employee_id: 'p4',
        start_time: '2026-07-27T00:00:00',
        status: 'scheduled',
        metadata: { location: '8:00' },
      },
      {
        employee_id: 'p9',
        start_time: '2026-07-29T00:00:00',
        status: 'scheduled',
        metadata: { location: 'ไปสาขา 2', remark: 'คั่วกาแฟ', is_management: true },
      },
      {
        employee_id: 'p5',
        start_time: '2026-07-27T00:00:00',
        status: 'scheduled',
        metadata: { location: 'ร้านซักผ้า' },
      },
    ];

    const blockLayout = deriveWeekBlockLayout(32, [0, 1, 2, 3, 4, 5, 6], [
      'จ.',
      'อ.',
      'พ.',
      'พฤ.',
      'ศ.',
      'ส.',
      'อา.',
    ]);
    const updates = buildScheduleSheetsUpdates(
      weekStart,
      profiles,
      shifts,
      'ตารางงานเดือน ก.ค. 69',
      blockLayout,
    );
    const byRange = new Map(updates.map((entry) => [entry.range, entry.values]));

    expect(updates).toHaveLength(3);
    expect(byRange.get("'ตารางงานเดือน ก.ค. 69'!B34:H39")).toEqual([
      ['ปิ่น', '', '', '', '', '', ''],
      ['นิต้า', '', '', '', '', '', ''],
      ['มุก', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      ['ฟิว', '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
    ]);
    expect(byRange.get("'ตารางงานเดือน ก.ค. 69'!B42:H42")).toEqual([['ล่า', '', '', '', '', '', '']]);
    expect(byRange.get("'ตารางงานเดือน ก.ค. 69'!B43:H43")).toEqual([['', '', 'ชัช', '', '', '', '']]);

    for (const range of byRange.keys()) {
      expect(range).not.toMatch(/![I-Z]/);
      expect(range).not.toMatch(/!A\d/);
      expect(range).not.toMatch(/!B32:H33/);
      expect(range).not.toMatch(/!B40:H40/);
    }
  });
});
