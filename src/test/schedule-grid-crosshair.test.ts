import { describe, expect, test } from 'vitest';
import {
  scheduleCrosshairCellClass,
  scheduleCrosshairColBandClass,
  scheduleCrosshairColumnHeaderClass,
  scheduleCrosshairNameClass,
  scheduleCrosshairRowBandClass,
} from '@/lib/schedule/grid-crosshair';

const focus = { employeeId: 'p1', date: '2026-07-07' };

describe('schedule grid crosshair', () => {
  test('highlights intersection cell only with cell class', () => {
    expect(scheduleCrosshairCellClass('p1', '2026-07-07', focus)).toBe(
      'bb-schedule-crosshair-cell',
    );
    expect(scheduleCrosshairCellClass('p2', '2026-07-07', focus)).toBe('');
    expect(scheduleCrosshairCellClass('p1', '2026-07-08', focus)).toBe(
      'bb-schedule-crosshair-row-band',
    );
  });

  test('row band marks same employee on other days', () => {
    expect(scheduleCrosshairRowBandClass('p1', '2026-07-08', focus)).toBe(
      'bb-schedule-crosshair-row-band',
    );
    expect(scheduleCrosshairRowBandClass('p1', '2026-07-07', focus)).toBe('');
    expect(scheduleCrosshairRowBandClass('p2', '2026-07-08', focus)).toBe('');
  });

  test('column guide is header-only to avoid stacked row×column fills in body', () => {
    expect(scheduleCrosshairColBandClass('p2', '2026-07-07', focus)).toBe('');
    expect(scheduleCrosshairColumnHeaderClass('2026-07-07', focus)).toBe(
      'bb-schedule-crosshair-col-h',
    );
  });

  test('name and column header classes follow focus', () => {
    expect(scheduleCrosshairNameClass('p1', focus)).toBe('bb-schedule-crosshair-name');
    expect(scheduleCrosshairNameClass('p2', focus)).toBe('');
    expect(scheduleCrosshairColumnHeaderClass('2026-07-07', focus)).toBe(
      'bb-schedule-crosshair-col-h',
    );
  });
});
