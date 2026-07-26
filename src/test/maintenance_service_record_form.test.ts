import { describe, expect, test } from 'vitest';
import {
  buildServiceRecordPayload,
  formatFrequencyMonths,
  getTaskTypeInputValue,
  getTaskTypeSelectValue,
  getUniqueEquipmentSuggestions,
  isTaskTypePreset,
  parseFrequencyMonthsForDisplay,
  resolveTaskType,
} from '@/lib/maintenance/service-record-form';

describe('maintenance service record form helpers', () => {
  test('deduplicates equipment suggestions and filters by typed text', () => {
    expect(
      getUniqueEquipmentSuggestions(
        ['เครื่องชงกาแฟ', 'เครื่องบดกาแฟ', 'เครื่องชงกาแฟ', '  เครื่องชง  กาแฟ  '],
        'เครื่องชง',
      ),
    ).toEqual(['เครื่องชงกาแฟ']);
  });

  test('keeps custom task types editable while mapping presets correctly', () => {
    expect(isTaskTypePreset('อื่นๆ')).toBe(true);
    expect(getTaskTypeSelectValue('ตรวจเช็กพิเศษ')).toBe('อื่นๆ');
    expect(getTaskTypeInputValue('ตรวจเช็กพิเศษ')).toBe('ตรวจเช็กพิเศษ');
    expect(getTaskTypeInputValue('ซ่อมแซม')).toBe('');
  });

  test('resolves other task type to custom text or default label', () => {
    expect(resolveTaskType('อื่นๆ', 'ตรวจเช็กพิเศษ')).toBe('ตรวจเช็กพิเศษ');
    expect(resolveTaskType('อื่นๆ', '   ')).toBe('อื่นๆ');
    expect(resolveTaskType('ซ่อมแซม', 'ตรวจเช็กพิเศษ')).toBe('ซ่อมแซม');
  });

  test('formats month-only frequency values for storage', () => {
    expect(formatFrequencyMonths('3')).toBe('ทุก 3 เดือน');
    expect(formatFrequencyMonths('03')).toBe('ทุก 3 เดือน');
    expect(formatFrequencyMonths('')).toBeNull();
    expect(formatFrequencyMonths('abc')).toBeNull();
  });

  test('parses stored frequency back to month digits for editing', () => {
    expect(parseFrequencyMonthsForDisplay('ทุก 3 เดือน')).toBe('3');
    expect(parseFrequencyMonthsForDisplay('3')).toBe('3');
    expect(parseFrequencyMonthsForDisplay('ทุก 2 สัปดาห์')).toBe('');
  });

  test('builds payload with completion date and without retired fields', () => {
    expect(
      buildServiceRecordPayload(
        {
          start_date: '2026-07-26',
          equipment: 'เครื่องชงกาแฟ',
          detected_problem: 'น้ำไม่ไหล',
          task_type: 'ตรวจเช็กพิเศษ',
          work_details: 'ล้างหัวชง',
          recommended_frequency: '6',
        },
        '2026-07-26',
      ),
    ).toEqual({
      start_date: '2026-07-26',
      equipment: 'เครื่องชงกาแฟ',
      detected_problem: 'น้ำไม่ไหล',
      task_type: 'ตรวจเช็กพิเศษ',
      work_details: 'ล้างหัวชง',
      recommended_frequency: 'ทุก 6 เดือน',
      completion_date: '2026-07-26',
    });
  });
});
