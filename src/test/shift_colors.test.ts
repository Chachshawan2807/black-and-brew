import { describe, expect, it } from 'vitest';
import {
  DAY_OFF_COLOR,
  getShiftColorClass,
  getShiftColorStyle,
  INVENTORY_QUICK_ACTION_COLORS,
  inventoryQuickActionTypeColors,
} from '@/lib/shift-colors';
import { BB_PASTEL_BORDER_COLOR } from '@/lib/ui-outlined-tokens';

describe('shift-colors presentation', () => {
  it('returns pastel background styles for timed shifts (matches schedule table)', () => {
    expect(getShiftColorStyle('6:30')).toEqual({
      backgroundColor: '#d4edda',
      borderColor: BB_PASTEL_BORDER_COLOR,
      color: '#000000',
    });
    expect(getShiftColorStyle('7:00')).toEqual({
      backgroundColor: '#ffffff',
      borderColor: BB_PASTEL_BORDER_COLOR,
      color: '#000000',
    });
    expect(getShiftColorStyle('8:00')).toEqual({
      backgroundColor: '#fff3cd',
      borderColor: BB_PASTEL_BORDER_COLOR,
      color: '#000000',
    });
  });

  it('returns pastel styles for special duty and leave shifts', () => {
    expect(getShiftColorStyle('ร้านซักผ้า')).toEqual({
      backgroundColor: '#d1ecf1',
      borderColor: BB_PASTEL_BORDER_COLOR,
      color: '#000000',
    });
    expect(getShiftColorStyle('ลา', 'on_leave')).toEqual({
      backgroundColor: '#f8d7da',
      borderColor: BB_PASTEL_BORDER_COLOR,
      color: '#000000',
    });
  });

  it('pairs structural className with inline colors for roster/dashboard cells', () => {
    const className = getShiftColorClass('6:30');
    const style = getShiftColorStyle('6:30');

    expect(className).toContain('bb-pastel-surface');
    expect(className).toContain('border-black');
    expect(style.backgroundColor).toBe('#d4edda');
    expect(style.borderColor).toBe(BB_PASTEL_BORDER_COLOR);
  });

  it('keeps day-off card using pink pastel class', () => {
    expect(DAY_OFF_COLOR).toContain('bg-[#f8d7da]');
    expect(DAY_OFF_COLOR).toContain('border-black');
  });

  it('uses distinct pastels for inventory secondary actions and FAB', () => {
    expect(INVENTORY_QUICK_ACTION_COLORS.order).toContain('bg-[#d1ecf1]');
    expect(INVENTORY_QUICK_ACTION_COLORS.addItem).toContain('bg-[#d4edda]');
    expect(INVENTORY_QUICK_ACTION_COLORS.history).toContain('bg-[#f7f5e8]');
    expect(INVENTORY_QUICK_ACTION_COLORS.fab).toContain('bg-[#fff3cd]');
    expect(INVENTORY_QUICK_ACTION_COLORS.in).toContain('border-black');

    const backgrounds = [
      INVENTORY_QUICK_ACTION_COLORS.order,
      INVENTORY_QUICK_ACTION_COLORS.addItem,
      INVENTORY_QUICK_ACTION_COLORS.history,
      INVENTORY_QUICK_ACTION_COLORS.fab,
    ];
    expect(new Set(backgrounds).size).toBe(4);
  });

  it('maps quick action types to matching IN/OUT/ADJUST pastels', () => {
    expect(inventoryQuickActionTypeColors('IN')).toBe(INVENTORY_QUICK_ACTION_COLORS.in);
    expect(inventoryQuickActionTypeColors('OUT')).toBe(INVENTORY_QUICK_ACTION_COLORS.out);
    expect(inventoryQuickActionTypeColors('ADJUST')).toBe(INVENTORY_QUICK_ACTION_COLORS.adjust);
  });
});
