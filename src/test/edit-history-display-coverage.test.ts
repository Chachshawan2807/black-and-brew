import { describe, expect, test } from 'vitest';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import { filterEditHistoryRows } from '@/lib/data-change-log';
import { formatDataChangeHistoryMeta } from '@/lib/data-change-history-display';
import { formatDataChangeLogDisplay } from '@/lib/inventory-notification-formatter';

function makeRow(overrides: Partial<DataChangeLogRow> = {}): DataChangeLogRow {
  return {
    id: 'log-1',
    occurred_at: '2026-09-08T10:30:00.000Z',
    actor_id: null,
    actor_label: 'ผู้แก้ไข (Android)',
    actor_access_level: 'full',
    action: 'UPDATE',
    module: 'inventory',
    entity_type: 'inventory_item',
    entity_id: 'item-1',
    entity_label: 'เมล็ดกาแฟ',
    field_changes: [{ field: 'stock', old_value: 5, new_value: 8 }],
    old_value: null,
    new_value: null,
    source: 'server_action',
    ip_address: null,
    user_agent: null,
    status: 'success',
    error_message: null,
    metadata: {},
    ...overrides,
  };
}

function expectReadableThaiDisplay(row: DataChangeLogRow) {
  const display = formatDataChangeLogDisplay(row, 'th');
  const meta = formatDataChangeHistoryMeta(row, 'th');

  expect(display.headline.length).toBeGreaterThan(0);
  expect(display.detail.length).toBeGreaterThan(0);
  expect(meta).toContain('ผู้แก้ไข');
  expect(meta).not.toContain('จากเครือข่าย');

  const combined = [display.headline, display.detail, ...(display.detailLines ?? []), meta].join(' ');
  expect(combined).not.toMatch(/\bactiveStaff\b/);
  expect(combined).not.toMatch(/\bshiftText\b/);
  expect(combined).not.toMatch(/\btomorrow\b/);
}

describe('edit history display coverage', () => {
  test('inventory stock change uses Thai headline and detail', () => {
    expectReadableThaiDisplay(
      makeRow({
        metadata: {
          operation: 'record_transaction',
          type: 'IN',
          quantity: 3,
          itemName: 'เมล็ดกาแฟ',
        },
      }),
    );
  });

  test('schedule shift change derives readable Thai detail', () => {
    expectReadableThaiDisplay(
      makeRow({
        module: 'schedule',
        entity_type: 'shift',
        entity_label: 'กะเช้า',
        field_changes: [],
        old_value: { status: 'OFF' },
        new_value: { status: 'MORNING' },
      }),
    );
  });

  test('dashboard reorder uses metadata operation detail', () => {
    const display = formatDataChangeLogDisplay(
      makeRow({
        module: 'dashboard',
        entity_type: 'profile',
        action: 'BULK_UPDATE',
        entity_label: null,
        field_changes: [],
        metadata: { operation: 'update_dashboard_order', orderedIds: ['a', 'b'] },
      }),
      'th',
    );
    expect(display.headline).toContain('แดชบอร์ด');
    expect(display.detail).toBe('จัดลำดับพนักงานในแดชบอร์ดใหม่');
  });

  test('maintenance service record shows Thai field labels', () => {
    const display = formatDataChangeLogDisplay(
      makeRow({
        module: 'maintenance',
        entity_type: 'service_record',
        entity_label: 'เครื่องชงกาแฟ',
        field_changes: [{ field: 'cost', old_value: 500, new_value: 1200 }],
      }),
      'th',
    );
    expect(display.detail).toContain('ค่าใช้จ่าย');
    expect(display.detail).toContain('500');
    expect(display.detail).toContain('1200');
  });

  test('holiday regular days render Thai day names', () => {
    const display = formatDataChangeLogDisplay(
      makeRow({
        module: 'holiday',
        entity_type: 'regular_holiday',
        entity_label: 'พนักงาน A',
        field_changes: [{ field: 'days', old_value: [0], new_value: [0, 6] }],
      }),
      'th',
    );
    expect(display.detail).toContain('อาทิตย์');
    expect(display.detail).toContain('เสาร์');
  });

  test('bean order audit rows use Thai headlines and enum labels', () => {
    const display = formatDataChangeLogDisplay(
      makeRow({
        module: 'bean_orders',
        entity_type: 'bean_order',
        entity_label: 'BO-250908-01',
        field_changes: [{ field: 'payment_status', old_value: 'unpaid', new_value: 'paid' }],
      }),
      'th',
    );
    expect(display.headline).toBe('แก้ไขออเดอร์ BO-250908-01');
    expect(display.detail).toContain('ยังไม่ชำระ');
    expect(display.detail).toContain('ชำระแล้ว');
  });

  test('bean order slip upload keeps staff edit in history', () => {
    expectReadableThaiDisplay(
      makeRow({
        module: 'bean_orders',
        entity_type: 'bean_order_payment',
        entity_label: 'BO-250908-01',
        field_changes: [],
        metadata: { action: 'slip_uploaded' },
      }),
    );
  });

  test('failed edits surface error message in settings section', () => {
    const row = makeRow({
      status: 'failed',
      error_message: 'RLS blocked',
      field_changes: [],
    });
    const contentLines =
      row.status === 'failed'
        ? [row.error_message ?? 'บันทึกไม่สำเร็จ']
        : [formatDataChangeLogDisplay(row, 'th').detail];

    expect(contentLines[0]).toBe('RLS blocked');
  });
});

describe('filterEditHistoryRows', () => {
  test('removes payment notification duplicates but keeps slip uploads', () => {
    const rows = [
      makeRow({
        id: 'staff-slip',
        entity_type: 'bean_order_payment',
        metadata: { action: 'slip_uploaded' },
      }),
      makeRow({
        id: 'notify-paid',
        entity_type: 'bean_order_payment',
        metadata: { kind: 'bean_order_payment_confirmed' },
      }),
    ];

    const filtered = filterEditHistoryRows(rows);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('staff-slip');
  });
});
