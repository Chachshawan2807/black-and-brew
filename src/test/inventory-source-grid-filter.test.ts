import { describe, expect, test } from 'vitest';
import {
  filterInventoryItemsBySources,
  getInventoryGridSources,
  inventorySourceLabel,
  toggleInventorySourceSelection,
} from '@/lib/inventory-stock';

describe('inventory source grid filter', () => {
  const items = [
    { id: '1', name: 'A', source: 'Shopee', stock: 1, order_point: 0, target_stock: 0, sort_order: 1 },
    { id: '2', name: 'B', source: 'Lazada', stock: 1, order_point: 0, target_stock: 0, sort_order: 2 },
    { id: '3', name: 'C', source: '', stock: 1, order_point: 0, target_stock: 0, sort_order: 3 },
  ];

  test('inventorySourceLabel falls back when source is blank', () => {
    expect(inventorySourceLabel(items[2]!)).toBe('ไม่ได้ระบุแหล่งที่มา');
  });

  test('getInventoryGridSources returns unique labels', () => {
    expect(getInventoryGridSources(items)).toEqual(['Shopee', 'Lazada', 'ไม่ได้ระบุแหล่งที่มา']);
  });

  test('filterInventoryItemsBySources returns all rows for all tab', () => {
    expect(filterInventoryItemsBySources(items, ['all'])).toHaveLength(3);
  });

  test('filterInventoryItemsBySources filters by selected channels', () => {
    const filtered = filterInventoryItemsBySources(items, ['Shopee', 'Lazada']);
    expect(filtered.map((item) => item.id)).toEqual(['1', '2']);
  });

  test('toggleInventorySourceSelection supports multi-select and reset', () => {
    expect(toggleInventorySourceSelection(['all'], 'Shopee')).toEqual(['Shopee']);
    expect(toggleInventorySourceSelection(['Shopee'], 'Lazada')).toEqual(['Shopee', 'Lazada']);
    expect(toggleInventorySourceSelection(['Shopee', 'Lazada'], 'Shopee')).toEqual(['Lazada']);
    expect(toggleInventorySourceSelection(['Lazada'], 'Lazada')).toEqual(['all']);
    expect(toggleInventorySourceSelection(['Shopee'], 'all')).toEqual(['all']);
  });
});
