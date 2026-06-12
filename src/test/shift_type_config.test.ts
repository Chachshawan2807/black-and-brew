import { describe, expect, test } from 'vitest';
import {
  DEFAULT_SHIFT_TYPES,
  buildShiftDisplay,
  collectShiftRenames,
  createNewShiftEntry,
  findShiftTypeByLocation,
  normalizeShiftTypes,
  resolveShiftNamePreset,
} from '@/lib/shift-type-config';

describe('shift-type-config', () => {
  test('normalizeShiftTypes returns defaults for invalid input', () => {
    expect(normalizeShiftTypes(null)).toEqual(DEFAULT_SHIFT_TYPES);
    expect(normalizeShiftTypes([])).toEqual(DEFAULT_SHIFT_TYPES);
  });

  test('normalizeShiftTypes merges saved overrides with defaults', () => {
    const result = normalizeShiftTypes([
      {
        id: 'type-630',
        label: 'กะเช้า',
        value: 'กะเช้า',
        bgColor: '#d4edda',
        borderColor: '#c3e6cb',
      },
    ]);

    expect(result.find((t) => t.id === 'type-630')?.label).toBe('กะเช้า');
    expect(result).toHaveLength(DEFAULT_SHIFT_TYPES.length);
  });

  test('findShiftTypeByLocation matches value and aliases', () => {
    const types = normalizeShiftTypes(DEFAULT_SHIFT_TYPES);
    expect(findShiftTypeByLocation('6:30', types)?.id).toBe('type-630');
    expect(findShiftTypeByLocation('เข้ากะ 06:30', types)?.id).toBe('type-630');
    expect(findShiftTypeByLocation('ร้านซักผ้า', types)?.id).toBe('type-laundry');
  });

  test('buildShiftDisplay produces pastel surface class and inline colors', () => {
    const display = buildShiftDisplay(DEFAULT_SHIFT_TYPES[0]);
    expect(display.className).toContain('bb-pastel-surface');
    expect(display.style.backgroundColor).toBe('#d4edda');
    expect(display.style.color).toBe('#000000');
  });

  test('collectShiftRenames detects value changes by stable id', () => {
    const previous = normalizeShiftTypes(DEFAULT_SHIFT_TYPES);
    const next = previous.map((t) =>
      t.id === 'type-700' ? { ...t, label: 'กะสาย', value: 'กะสาย' } : t
    );

    expect(collectShiftRenames(previous, next)).toEqual([
      { oldValue: '7:00', newValue: 'กะสาย' },
    ]);
  });

  test('normalizeShiftTypes preserves custom shift entries', () => {
    const custom = {
      id: 'type-custom-99',
      label: 'กะดึก',
      value: 'กะดึก',
      bgColor: '#f3e8ff',
      borderColor: '#d8b4fe',
    };
    const result = normalizeShiftTypes([...DEFAULT_SHIFT_TYPES, custom]);

    expect(result.find((t) => t.id === 'type-custom-99')?.label).toBe('กะดึก');
    expect(result.length).toBe(DEFAULT_SHIFT_TYPES.length + 1);
  });

  test('createNewShiftEntry generates unique label', () => {
    const first = createNewShiftEntry(DEFAULT_SHIFT_TYPES);
    const second = createNewShiftEntry([...DEFAULT_SHIFT_TYPES, first]);

    expect(first.id).toMatch(/^type-custom-/);
    expect(second.label).not.toBe(first.label);
  });

  test('resolveShiftNamePreset maps known and custom names', () => {
    expect(resolveShiftNamePreset('7:00')).toBe('7:00');
    expect(resolveShiftNamePreset('กะพิเศษ')).toBe('__custom__');
  });
});
