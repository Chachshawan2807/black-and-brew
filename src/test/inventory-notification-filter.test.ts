import { describe, expect, test } from 'vitest';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import {
  INVENTORY_NOTIFICATION_SOURCES,
  isAllowedInventoryNotificationSource,
  isEligibleInventoryNotification,
  isNotifyableStockOperation,
  isSuppressedInventoryNotification,
} from '@/lib/inventory-notification-filter';

function makeRow(metadata: Record<string, unknown> = {}): DataChangeLogRow {
  return {
    id: 'log-1',
    occurred_at: new Date().toISOString(),
    actor_id: null,
    actor_label: 'Alice',
    actor_access_level: 'full',
    action: 'UPDATE',
    module: 'inventory',
    entity_type: 'inventory_item',
    entity_id: 'item-1',
    entity_label: 'Coffee',
    field_changes: [{ field: 'stock', old_value: 0, new_value: 5 }],
    old_value: null,
    new_value: null,
    source: 'web',
    ip_address: null,
    user_agent: null,
    status: 'success',
    error_message: null,
    metadata,
  };
}

describe('isSuppressedInventoryNotification', () => {
  test('suppresses inventory count context', () => {
    expect(
      isSuppressedInventoryNotification({ notificationContext: 'inventory_count' })
    ).toBe(true);
  });

  test('suppresses explicit flag', () => {
    expect(isSuppressedInventoryNotification({ suppressNotification: true })).toBe(true);
  });

  test('suppresses missing metadata (strict allow-list)', () => {
    expect(isSuppressedInventoryNotification(undefined)).toBe(true);
  });
});

describe('isAllowedInventoryNotificationSource', () => {
  test('allows quick action bar, FAB, and warehouse grid sources', () => {
    expect(
      isAllowedInventoryNotificationSource({
        notificationSource: INVENTORY_NOTIFICATION_SOURCES.QUICK_ACTION_BAR,
      })
    ).toBe(true);
    expect(
      isAllowedInventoryNotificationSource({
        notificationSource: INVENTORY_NOTIFICATION_SOURCES.QUICK_ACTION_FAB,
      })
    ).toBe(true);
    expect(
      isAllowedInventoryNotificationSource({
        notificationSource: INVENTORY_NOTIFICATION_SOURCES.WAREHOUSE_GRID,
      })
    ).toBe(true);
  });

  test('rejects unknown sources', () => {
    expect(isAllowedInventoryNotificationSource({ notificationSource: 'warehouse_edit' })).toBe(
      false
    );
    expect(isAllowedInventoryNotificationSource({ operation: 'set_stock' })).toBe(false);
  });
});

describe('isNotifyableStockOperation', () => {
  test('allows IN, OUT, and ADJUST', () => {
    expect(
      isNotifyableStockOperation({ operation: 'record_transaction', type: 'IN' })
    ).toBe(true);
    expect(
      isNotifyableStockOperation({ operation: 'record_transaction', type: 'OUT' })
    ).toBe(true);
    expect(isNotifyableStockOperation({ operation: 'set_stock' })).toBe(true);
  });

  test('rejects create, delete, and reorder operations', () => {
    expect(isNotifyableStockOperation({ operation: 'reorder_sort_order' })).toBe(false);
    expect(isNotifyableStockOperation({})).toBe(false);
  });
});

describe('isEligibleInventoryNotification', () => {
  test('allows quick action IN with valid source', () => {
    expect(
      isEligibleInventoryNotification(
        makeRow({
          notificationSource: INVENTORY_NOTIFICATION_SOURCES.QUICK_ACTION_BAR,
          operation: 'record_transaction',
          type: 'IN',
          quantity: 2,
        })
      )
    ).toBe(true);
  });

  test('allows warehouse grid stock edits', () => {
    expect(
      isEligibleInventoryNotification(
        makeRow({
          notificationSource: INVENTORY_NOTIFICATION_SOURCES.WAREHOUSE_GRID,
          operation: 'set_stock',
          notificationContext: 'inventory',
        })
      )
    ).toBe(true);
  });

  test('mutes warehouse stock edits without notification source', () => {
    expect(
      isEligibleInventoryNotification(
        makeRow({
          operation: 'set_stock',
          notificationContext: 'inventory',
        })
      )
    ).toBe(false);
  });

  test('mutes inventory count adjustments', () => {
    expect(
      isEligibleInventoryNotification(
        makeRow({
          notificationContext: 'inventory_count',
          operation: 'set_stock',
        })
      )
    ).toBe(false);
  });

  test('mutes delete and field edits without stock notification source', () => {
    expect(
      isEligibleInventoryNotification(
        makeRow({
          operation: 'reorder_sort_order',
        })
      )
    ).toBe(false);
  });
});
