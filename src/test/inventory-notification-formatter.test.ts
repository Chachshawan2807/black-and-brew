import { describe, expect, test } from 'vitest';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import {
  detectLowStockCrossing,
  formatFieldChange,
  formatInventoryNotification,
  resolveNotificationPriority,
  shouldShowToast,
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
    ).toBe('สต็อก: 10 → 8');
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
        { field: 'name', old_value: 'A', new_value: 'B' },
        { field: 'unit', old_value: 'kg', new_value: 'g' },
      ],
      true,
      2
    );
    expect(summary).toContain('+1 ฟิลด์');
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
    expect(n.summary).toContain('สต็อก');
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

describe('shouldShowToast', () => {
  test('shows toast for high priority', () => {
    const n = formatInventoryNotification(makeRow({ action: 'DELETE' }), 'th');
    expect(shouldShowToast(n)).toBe(true);
  });

  test('hides toast for normal priority', () => {
    const n = formatInventoryNotification(makeRow(), 'th');
    expect(shouldShowToast(n)).toBe(false);
  });
});
