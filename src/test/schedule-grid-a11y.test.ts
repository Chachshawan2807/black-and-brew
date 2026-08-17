import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import type { KeyboardEvent } from 'react';
import {
  formatScheduleGridDateLabel,
  getScheduleEmployeeNameEditAriaLabel,
  getScheduleEmployeeNameInputName,
  getScheduleHolidayCellAriaLabel,
  getScheduleHolidayInputName,
  getScheduleShiftCellAriaLabel,
  handleGridCellKeyboardActivate,
} from '@/lib/schedule-grid-cell-a11y';

describe('schedule grid cell a11y helpers', () => {
  test('formats grid date label with Thai weekday', () => {
    expect(formatScheduleGridDateLabel('2026-08-18')).toMatch(/^อ\.\s18$/);
  });

  test('describes occupied shift cells', () => {
    expect(
      getScheduleShiftCellAriaLabel({
        employeeName: 'สมชาย',
        dateLabel: 'จ. 18',
        shiftLabel: 'เช้า',
      }),
    ).toBe('กะ เช้า ของ สมชาย วันจ. 18');
  });

  test('describes empty shift cells', () => {
    expect(
      getScheduleShiftCellAriaLabel({
        employeeName: 'สมชาย',
        dateLabel: 'จ. 18',
        shiftLabel: null,
      }),
    ).toBe('เพิ่มกะ สมชาย วันจ. 18');
  });

  test('describes holiday cells', () => {
    expect(getScheduleHolidayCellAriaLabel('จ. 18', 'วันแม่')).toBe(
      'วันหยุด จ. 18: วันแม่',
    );
    expect(getScheduleHolidayCellAriaLabel('จ. 18', '')).toBe(
      'แตะเพื่อเพิ่มวันหยุด จ. 18',
    );
  });

  test('builds stable input names', () => {
    expect(getScheduleEmployeeNameInputName('emp-1')).toBe('schedule-employee-name-emp-1');
    expect(getScheduleHolidayInputName('2026-08-18')).toBe('schedule-holiday-2026-08-18');
  });

  test('employee name edit label includes current name', () => {
    expect(getScheduleEmployeeNameEditAriaLabel('สมหญิง')).toBe('แก้ไขชื่อพนักงาน สมหญิง');
  });

  test('keyboard helper activates on Enter and Space', () => {
    const activations: string[] = [];
    const activate = () => activations.push('ok');

    handleGridCellKeyboardActivate(
      { key: 'Enter', preventDefault: () => {} } as KeyboardEvent,
      activate,
    );
    handleGridCellKeyboardActivate(
      { key: ' ', preventDefault: () => {} } as KeyboardEvent,
      activate,
    );
    handleGridCellKeyboardActivate(
      { key: 'Escape', preventDefault: () => {} } as KeyboardEvent,
      activate,
    );

    expect(activations).toEqual(['ok', 'ok']);
  });
});

const scheduleClientPath = path.resolve(
  __dirname,
  '../app/[locale]/schedule/ScheduleClient.tsx',
);

describe('schedule grid a11y wiring', () => {
  test('ScheduleClient wires shift and holiday cell helpers', () => {
    const source = fs.readFileSync(scheduleClientPath, 'utf-8');

    expect(source).toContain("from '@/lib/schedule-grid-cell-a11y'");
    expect(source).toContain('getScheduleShiftCellAriaLabel');
    expect(source).toContain('getScheduleHolidayCellAriaLabel');
    expect(source).toContain('handleGridCellKeyboardActivate');
    expect(source).toContain('role="button"');
    expect(source).toContain('getScheduleHolidayInputName');
  });
});
