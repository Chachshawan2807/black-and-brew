import { describe, expect, test } from 'vitest';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import {
  detectLowStockCrossing,
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
});

