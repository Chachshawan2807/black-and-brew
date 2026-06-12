import { describe, expect, it } from 'vitest';
import {
  DAY_OFF_COLOR,
  getShiftColorClass,
  getShiftColorStyle,
} from '@/lib/shift-colors';

describe('shift-colors presentation', () => {
  it('returns pastel background styles for timed shifts (matches schedule table)', () => {
    expect(getShiftColorStyle('6:30')).toEqual({
      backgroundColor: '#d4edda',
      borderColor: '#c3e6cb',
      color: '#000000',
    });
    expect(getShiftColorStyle('7:00')).toEqual({
      backgroundColor: '#ffffff',
      borderColor: '#d1d5db',
      color: '#000000',
    });
    expect(getShiftColorStyle('8:00')).toEqual({
      backgroundColor: '#fff3cd',
      borderColor: '#ffeeba',
      color: '#000000',
    });
  });

  it('returns pastel styles for special duty and leave shifts', () => {
    expect(getShiftColorStyle('ร้านซักผ้า')).toEqual({
      backgroundColor: '#d1ecf1',
      borderColor: '#bee5eb',
      color: '#000000',
    });
    expect(getShiftColorStyle('ลา', 'on_leave')).toEqual({
      backgroundColor: '#f8d7da',
      borderColor: '#f5c6cb',
      color: '#000000',
    });
  });

  it('pairs structural className with inline colors for roster/dashboard cells', () => {
    const className = getShiftColorClass('6:30');
    const style = getShiftColorStyle('6:30');

    expect(className).toContain('bb-pastel-surface');
    expect(className).toContain('border');
    expect(style.backgroundColor).toBe('#d4edda');
  });

  it('keeps day-off card using pink pastel class', () => {
    expect(DAY_OFF_COLOR).toContain('bg-[#f8d7da]');
  });
});
