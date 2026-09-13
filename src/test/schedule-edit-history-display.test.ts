import { describe, expect, test } from 'vitest';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import { formatDataChangeLogDisplay } from '@/lib/inventory-notification-formatter';
import { formatScheduleShiftEditHistoryDisplay } from '@/lib/schedule/edit-history-display';

function makeShiftRow(overrides: Partial<DataChangeLogRow> = {}): DataChangeLogRow {
  return {
    id: 'log-shift-1',
    occurred_at: '2026-09-13T12:00:00.000Z',
    actor_id: null,
    actor_label: 'ผู้แก้ไข (Windows)',
    actor_access_level: 'full',
    action: 'UPDATE',
    module: 'schedule',
    entity_type: 'shift',
    entity_id: 'shift-1',
    entity_label: 'ปิ่น',
    field_changes: [],
    old_value: {
      employee_id: 'emp-1',
      start_time: '2026-09-14T00:00:00',
      end_time: '2026-09-14T23:59:59',
      status: 'scheduled',
      metadata: { location: '8:00', remark: '' },
    },
    new_value: {
      employee_id: 'emp-1',
      start_time: '2026-09-14T00:00:00',
      end_time: '2026-09-14T23:59:59',
      status: 'scheduled',
      metadata: { location: '7:00', remark: '' },
    },
    source: 'server_action',
    ip_address: null,
    user_agent: null,
    status: 'success',
    error_message: null,
    metadata: { staffName: 'ปิ่น', workDate: '2026-09-14', employeeId: 'emp-1' },
    ...overrides,
  };
}

describe('formatScheduleShiftEditHistoryDisplay', () => {
  test('shows staff, work date, and shift change without end_time noise', () => {
    const display = formatScheduleShiftEditHistoryDisplay(makeShiftRow(), 'th');

    expect(display.headline).toContain('แก้ไขกะ');
    expect(display.headline).toContain('ปิ่น');
    expect(display.headline).toContain('14');
    expect(display.detail).toContain('กะ: 8:00 → 7:00');
    expect(display.detail).not.toContain('วันที่สิ้นสุด');
    expect(display.detail).not.toContain('T23:59:59');
  });

  test('formatDataChangeLogDisplay routes schedule shift rows through schedule formatter', () => {
    const display = formatDataChangeLogDisplay(makeShiftRow(), 'th');
    expect(display.headline).toContain('ปิ่น');
    expect(display.detail).toContain('8:00 → 7:00');
  });
});
