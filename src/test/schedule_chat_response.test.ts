import { describe, expect, test } from 'vitest';
import {
  isDailyScheduleQuery,
  resolveScheduleTargetDate,
} from '@/lib/schedule/detect-schedule-query';
import { formatScheduleChatResponse } from '@/lib/schedule/format-schedule-chat-response';
import type { FormattedDailyShifts } from '@/lib/schedule/format-daily-shifts';

describe('detect-schedule-query', () => {
  test('detects short daily schedule prompts', () => {
    expect(isDailyScheduleQuery('ตารางงานวันนี้')).toBe(true);
    expect(isDailyScheduleQuery('ขอตารางงานของพนักงานทุกคนที่เข้ากะในวันพรุ่งนี้')).toBe(true);
  });

  test('does not treat weekly range queries as daily schedule', () => {
    expect(isDailyScheduleQuery('สรุปตารางงานสัปดาห์นี้')).toBe(false);
  });

  test('resolves relative dates from current ISO date', () => {
    expect(resolveScheduleTargetDate('ตารางงานวันนี้', '2026-06-07')).toBe('2026-06-07');
    expect(resolveScheduleTargetDate('ตารางงานพรุ่งนี้', '2026-06-07')).toBe('2026-06-08');
    expect(resolveScheduleTargetDate('ตารางงานเมื่อวาน', '2026-06-07')).toBe('2026-06-06');
  });
});

describe('formatScheduleChatResponse', () => {
  test('renders full grouped schedule text, not headcount only', () => {
    const shifts: FormattedDailyShifts = {
      front_store: [
        { row_order: 2, schedule_order: 1, name: 'ปิ่น', shift: '6:30', category: 'front_store' },
        { row_order: 4, schedule_order: 3, name: 'เม', shift: '7:00', category: 'front_store' },
      ],
      other_duty: [
        { row_order: 9, schedule_order: 8, name: 'ล่า', shift: 'ร้านซักผ้า', category: 'other_duty' },
      ],
      off_or_leave: [
        { row_order: 1, schedule_order: 0, name: 'นิต้า', shift: 'วันหยุด', category: 'off_or_leave' },
      ],
      all_staff: [],
    };

    const text = formatScheduleChatResponse('2026-06-07', shifts);

    expect(text).toContain('07-06-2026');
    expect(text).toContain('พนักงานปฏิบัติงานหน้าร้าน (รวม 2 คน)');
    expect(text).toContain('ปิ่น - 6:30');
    expect(text).toContain('ล่า - ร้านซักผ้า');
    expect(text).toContain('นิต้า - วันหยุด');
    expect(text).not.toBe('วันนี้ 0');
  });
});
