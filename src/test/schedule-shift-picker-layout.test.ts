import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';
import {
  SCHEDULE_SHIFT_PICKER_LIST_CLASS,
  SCHEDULE_SHIFT_PICKER_PANEL_CLASS,
} from '@/lib/schedule/shift-picker-layout';
import { readFileSync } from 'node:fs';

const ROOT = path.resolve(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

describe('schedule shift picker layout (regression)', () => {
  test('layout contract expands to show all options with viewport-capped fallback scroll', () => {
    expect(SCHEDULE_SHIFT_PICKER_PANEL_CLASS).toContain('h-max');
    expect(SCHEDULE_SHIFT_PICKER_PANEL_CLASS).toContain('flex-col');
    expect(SCHEDULE_SHIFT_PICKER_PANEL_CLASS).toContain('overflow-hidden');
    expect(SCHEDULE_SHIFT_PICKER_PANEL_CLASS).not.toContain('max-h-60');
    expect(SCHEDULE_SHIFT_PICKER_PANEL_CLASS).not.toMatch(/max-h-\[min\(24rem/);

    expect(SCHEDULE_SHIFT_PICKER_LIST_CLASS).toContain('min-h-0');
    expect(SCHEDULE_SHIFT_PICKER_LIST_CLASS).toContain('flex-1');
    expect(SCHEDULE_SHIFT_PICKER_LIST_CLASS).toContain('overflow-y-auto');
  });

  test('position math accounts for measured menu height', () => {
    const positionLib = read('lib/schedule/shift-picker-position.ts');
    expect(positionLib).toMatch(/bounds\.top \+ bounds\.height - menuHeight/);
    expect(positionLib).toContain('getScheduleShiftPickerMaxHeight');
    expect(positionLib).not.toMatch(/_menuHeight/);
  });

  test('ScheduleClient delegates picker UI to ScheduleShiftPickerPortal', () => {
    const schedule = read('app/[locale]/schedule/ScheduleClient.tsx');
    expect(schedule).toContain('ScheduleShiftPickerPortal');
    expect(schedule).not.toContain('bb-schedule-shift-picker');
    expect(schedule).not.toMatch(/function getDropdownPosition/);
  });

  test('portal component wires shared placement hook and layout classes', () => {
    const portal = read('app/[locale]/schedule/_components/ScheduleShiftPickerPortal.tsx');
    expect(portal).toContain('useScheduleShiftPickerPlacement');
    expect(portal).toContain('SCHEDULE_SHIFT_PICKER_PANEL_CLASS');
    expect(portal).toContain('SCHEDULE_SHIFT_PICKER_LIST_CLASS');
  });

  test('placement hook uses viewport bounds helpers', () => {
    const hook = readFileSync(
      path.resolve(ROOT, 'hooks/use-schedule-shift-picker-placement.ts'),
      'utf-8',
    );
    expect(hook).toContain('getScheduleShiftPickerPosition');
    expect(hook).toContain('getScheduleShiftPickerMaxHeight');
    expect(hook).toContain('ResizeObserver');
    expect(hook).toContain('visualViewport');
  });
});