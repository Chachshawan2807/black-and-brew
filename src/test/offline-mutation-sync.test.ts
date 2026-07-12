import { describe, expect, test, vi } from 'vitest';
import { replayOfflineMutation } from '@/lib/offline-mutation-sync';
import { INVENTORY_NOTIFICATION_SOURCES } from '@/lib/inventory-notification-filter';
import { READ_ONLY_DENY_MSG } from '@/lib/auth-constants';
import { UNAUTHORIZED_MSG } from '@/lib/policies/messages';

vi.mock('@/app/actions/inventory-actions', () => ({
  updateInventoryItemField: vi.fn(async () => ({ success: true })),
  updateInventoryStock: vi.fn(async () => ({ success: true, newStock: 5 })),
  reorderInventoryItems: vi.fn(async () => ({ success: true })),
}));

import {
  reorderInventoryItems,
  updateInventoryItemField,
  updateInventoryStock,
} from '@/app/actions/inventory-actions';

describe('offline-mutation-sync', () => {
  test('replays inventory field mutation via server action', async () => {
    const result = await replayOfflineMutation({
      id: '1',
      createdAt: Date.now(),
      kind: 'inventory_field',
      itemId: 'item-1',
      field: 'name',
      value: 'Milk',
      clientSessionId: 'sess',
    });
    expect(result.success).toBe(true);
    expect(updateInventoryItemField).toHaveBeenCalledWith('item-1', 'name', 'Milk', {
      clientSessionId: 'sess',
    });
  });

  test('replays stock mutation via server action', async () => {
    const result = await replayOfflineMutation({
      id: '2',
      createdAt: Date.now(),
      kind: 'inventory_stock',
      itemId: 'item-2',
      stock: 5,
      note: 'Warehouse edit',
      clientSessionId: 'sess',
      notificationSource: INVENTORY_NOTIFICATION_SOURCES.WAREHOUSE_GRID,
    });
    expect(result.success).toBe(true);
    expect(updateInventoryStock).toHaveBeenCalled();
  });

  test('replays reorder mutation via server action', async () => {
    const sortOrders = [{ id: 'a', sort_order: 1 }];
    const result = await replayOfflineMutation({
      id: '3',
      createdAt: Date.now(),
      kind: 'inventory_reorder',
      sortOrders,
      clientSessionId: 'sess',
    });
    expect(result.success).toBe(true);
    expect(reorderInventoryItems).toHaveBeenCalledWith(sortOrders, { clientSessionId: 'sess' });
  });

  test('marks auth failures as non-retryable', async () => {
    vi.mocked(updateInventoryItemField).mockResolvedValueOnce({
      success: false,
      error: UNAUTHORIZED_MSG,
    });

    const result = await replayOfflineMutation({
      id: '4',
      createdAt: Date.now(),
      kind: 'inventory_field',
      itemId: 'item-1',
      field: 'name',
      value: 'Milk',
    });

    expect(result).toEqual({ success: false, error: UNAUTHORIZED_MSG, retryable: false });
  });

  test('marks validation failures as non-retryable', async () => {
    vi.mocked(updateInventoryStock).mockResolvedValueOnce({
      success: false,
      error: 'Invalid stock update payload',
    });

    const result = await replayOfflineMutation({
      id: '5',
      createdAt: Date.now(),
      kind: 'inventory_stock',
      itemId: 'item-2',
      stock: 5,
      note: 'Warehouse edit',
    });

    expect(result).toEqual({
      success: false,
      error: 'Invalid stock update payload',
      retryable: false,
    });
  });

  test('marks read-only denial as non-retryable', async () => {
    vi.mocked(reorderInventoryItems).mockResolvedValueOnce({
      success: false,
      error: READ_ONLY_DENY_MSG,
    });

    const result = await replayOfflineMutation({
      id: '6',
      createdAt: Date.now(),
      kind: 'inventory_reorder',
      sortOrders: [{ id: 'a', sort_order: 1 }],
    });

    expect(result).toEqual({ success: false, error: READ_ONLY_DENY_MSG, retryable: false });
  });
});
