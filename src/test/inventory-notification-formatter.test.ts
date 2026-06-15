import { describe, expect, test } from 'vitest';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import {
  detectLowStockCrossing,
  formatBatchedNotificationFromRows,
  formatDataChangeLogDisplay,
  formatFieldChange,
  formatInventoryNotification,
  resolveNotificationPriority,
  summarizeFieldChanges,
} from '@/lib/inventory-notification-formatter';

function makeRow(overrides: Partial<DataChangeLogRow> = {}): DataChangeLogRow {
  return {
    id: 'log-1',
    occurred_at: '2026-06-12T10:00:00.000Z',
    actor_id: null,
    actor_label: 'ผู้ใช้เต็มสิทธิ์',
    actor_access_level: 'full',
    action: 'UPDATE',
    module: 'inventory',
    entity_type: 'inventory_item',
    entity_id: 'item-1',
    entity_label: 'เมล็ดกาแฟ',
    field_changes: [{ field: 'stock', old_value: 10, new_value: 8 }],
    old_value: null,
    new_value: null,
    source: 'web',
    ip_address: null,
    user_agent: null,
    status: 'success',
    error_message: null,
    metadata: {},
    ...overrides,
  };
}

describe('formatFieldChange', () => {
  test('formats stock diff in Thai', () => {
    expect(
      formatFieldChange({ field: 'stock', old_value: 10, new_value: 8 }, true)
    ).toBe('คงเหลือ: 10 → 8');
  });

  test('formats stock diff in English', () => {
    expect(
      formatFieldChange({ field: 'stock', old_value: 10, new_value: 8 }, false)
    ).toBe('Stock: 10 → 8');
  });
});

describe('summarizeFieldChanges', () => {
  test('truncates long field lists', () => {
    const summary = summarizeFieldChanges(
      [
        { field: 'stock', old_value: 1, new_value: 2 },
        { field: 'unit', old_value: 'kg', new_value: 'g' },
        { field: 'order_point', old_value: 5, new_value: 10 },
      ],
      true,
      2
    );
    expect(summary).toContain('และอีก');
  });

  test('hides technical id fields', () => {
    const summary = summarizeFieldChanges(
      [
        {
          field: 'id',
          old_value: null,
          new_value: '918198da-d6b9-4272-9474-e28acf5e88cb',
        },
        { field: 'name', old_value: null, new_value: 'ทดสอบ' },
        { field: 'stock', old_value: null, new_value: 0 },
      ],
      true,
      3
    );
    expect(summary).not.toContain('918198da');
    expect(summary).not.toContain('id:');
    expect(summary).toContain('คงเหลือ');
  });
});

describe('formatInventoryNotification CREATE', () => {
  test('uses readable summary without uuid for new items', () => {
    const n = formatInventoryNotification(
      makeRow({
        action: 'CREATE',
        entity_label: 'ทดสอบ',
        field_changes: [
          { field: 'id', old_value: null, new_value: '918198da-d6b9-4272-9474-e28acf5e88cb' },
          { field: 'name', old_value: null, new_value: 'ทดสอบ' },
          { field: 'stock', old_value: null, new_value: 0 },
          { field: 'unit', old_value: null, new_value: 'ถุง' },
        ],
      }),
      'th'
    );
    expect(n.title).toBe('เพิ่มรายการ: ทดสอบ');
    expect(n.summary).not.toContain('918198da');
    expect(n.summary).toContain('คงเหลือ');
  });
});

describe('detectLowStockCrossing', () => {
  test('detects stock crossing below order point when both fields present', () => {
    const crossing = detectLowStockCrossing([
      { field: 'stock', old_value: 12, new_value: 5 },
      { field: 'order_point', old_value: 10, new_value: 10 },
    ]);
    expect(crossing).toBe(true);
  });

  test('does not flag when stock stays above order point', () => {
    const crossing = detectLowStockCrossing([
      { field: 'stock', old_value: 15, new_value: 12 },
      { field: 'order_point', old_value: 10, new_value: 10 },
    ]);
    expect(crossing).toBe(false);
  });

  test('flags low stock when new stock is at or below order_point in same change', () => {
    const crossing = detectLowStockCrossing([
      { field: 'stock', old_value: 15, new_value: 5 },
      { field: 'order_point', old_value: 10, new_value: 10 },
    ]);
    expect(crossing).toBe(true);
  });
});

describe('resolveNotificationPriority', () => {
  test('DELETE is high priority', () => {
    expect(resolveNotificationPriority('DELETE', [])).toBe('high');
  });

  test('normal update is normal priority', () => {
    expect(
      resolveNotificationPriority('UPDATE', [{ field: 'name', old_value: 'A', new_value: 'B' }])
    ).toBe('normal');
  });
});

describe('formatInventoryNotification stock operations', () => {
  test('shows รับเข้า title with item name and quantity for IN transaction', () => {
    const n = formatInventoryNotification(
      makeRow({
        entity_label: null,
        field_changes: [{ field: 'stock', old_value: 0, new_value: 2 }],
        metadata: { operation: 'record_transaction', type: 'IN', quantity: 2, itemName: 'ฝาใส (แบบแพ็ค)' },
      }),
      'th'
    );
    expect(n.title).toBe('รับเข้า: ฝาใส (แบบแพ็ค)');
    expect(n.summary).toContain('รับ 2');
    expect(n.summary).toContain('คงเหลือ: 0 → 2');
  });

  test('shows นำออก title for OUT transaction', () => {
    const n = formatInventoryNotification(
      makeRow({
        entity_label: 'เมล็ดกาแฟ',
        field_changes: [{ field: 'stock', old_value: 10, new_value: 8 }],
        metadata: { operation: 'record_transaction', type: 'OUT', quantity: 2 },
      }),
      'th'
    );
    expect(n.title).toBe('นำออก: เมล็ดกาแฟ');
    expect(n.summary).toContain('นำออก 2');
    expect(n.summary).toContain('คงเหลือ: 10 → 8');
  });

  test('shows ปรับจำนวน title for set_stock adjustment', () => {
    const n = formatInventoryNotification(
      makeRow({
        entity_label: 'ถ้วยกระดาษ',
        field_changes: [{ field: 'stock', old_value: 5, new_value: 12 }],
        metadata: { operation: 'set_stock' },
      }),
      'th'
    );
    expect(n.title).toBe('ปรับจำนวน: ถ้วยกระดาษ');
    expect(n.summary).toContain('ปรับเป็น 12');
    expect(n.summary).toContain('คงเหลือ: 5 → 12');
  });

  test('shows English stock-in title and summary', () => {
    const n = formatInventoryNotification(
      makeRow({
        entity_label: 'Coffee beans',
        field_changes: [{ field: 'stock', old_value: 0, new_value: 2 }],
        metadata: { operation: 'record_transaction', type: 'IN', quantity: 2 },
      }),
      'en'
    );
    expect(n.title).toBe('Stock in: Coffee beans');
    expect(n.summary).toContain('Received 2');
    expect(n.summary).toContain('Stock: 0 → 2');
  });
});

describe('formatDataChangeLogDisplay', () => {
  test('reuses inventory notification formatting for inventory module', () => {
    const row = makeRow({
      entity_label: null,
      field_changes: [{ field: 'stock', old_value: 0, new_value: 10 }],
      metadata: { operation: 'record_transaction', type: 'IN', quantity: 10, itemName: 'ฝาใส' },
    });
    const display = formatDataChangeLogDisplay(row, 'th');
    expect(display.headline).toBe('รับเข้า: ฝาใส');
    expect(display.detail).toContain('รับ 10');
    expect(display.detail).toContain('คงเหลือ: 0 → 10');
  });

  test('uses generic headline for non-inventory modules', () => {
    const display = formatDataChangeLogDisplay(
      makeRow({
        module: 'schedule',
        entity_label: 'กะเช้า',
        field_changes: [{ field: 'start_time', old_value: '08:00', new_value: '09:00' }],
      }),
      'th'
    );
    expect(display.headline).toBe('แก้ไข: กะเช้า');
    expect(display.detail).toContain('08:00');
  });
});

describe('formatInventoryNotification', () => {
  test('builds Thai title and summary', () => {
    const n = formatInventoryNotification(makeRow(), 'th');
    expect(n.title).toContain('เมล็ดกาแฟ');
    expect(n.summary).toContain('คงเหลือ');
    expect(n.actorLabel).toBe('ผู้ใช้เต็มสิทธิ์');
  });

  test('builds English title', () => {
    const n = formatInventoryNotification(makeRow(), 'en');
    expect(n.title).toContain('Item updated');
    expect(n.summary).toContain('Stock');
  });

  test('batched count changes title', () => {
    const n = formatInventoryNotification(makeRow(), 'th', 4);
    expect(n.title).toContain('4 การเปลี่ยนแปลง');
    expect(n.batchedCount).toBe(4);
  });

  test('summarizes bulk quick-action IN rows in one notification', () => {
    const rows = [
      makeRow({
        entity_label: 'ถ้วย A',
        metadata: {
          operation: 'record_transaction',
          type: 'IN',
          quantity: 2,
          bulk: true,
          notificationSource: 'inventory_quick_action_bar',
        },
      }),
      makeRow({
        id: 'log-2',
        entity_id: 'item-2',
        entity_label: 'ถ้วย B',
        metadata: {
          operation: 'record_transaction',
          type: 'IN',
          quantity: 5,
          bulk: true,
          notificationSource: 'inventory_quick_action_bar',
        },
      }),
    ];
    const n = formatBatchedNotificationFromRows(rows, 'th');
    expect(n.title).toBe('รับเข้า: 2 รายการ');
    expect(n.summary).toContain('ถ้วย A +2');
    expect(n.summary).toContain('ถ้วย B +5');
    expect(n.batchedCount).toBe(2);
  });
});

