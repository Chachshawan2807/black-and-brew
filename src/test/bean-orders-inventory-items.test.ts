import { describe, expect, test } from 'vitest';
import {
  BEAN_ORDER_INVENTORY_ITEM_NAMES,
  filterBeanOrderInventoryItems,
} from '@/lib/bean-orders/inventory-items';

describe('bean order inventory items', () => {
  test('allows only the three roasted bean SKUs in fixed order', () => {
    const items = [
      { id: '1', name: 'ถุงกระดาษ' },
      { id: '2', name: 'เมล็ดกาแฟคั่วอ่อน' },
      { id: '3', name: 'เมล็ดกาแฟคั่วเข้ม' },
      { id: '4', name: 'เมล็ดกาแฟคั่วกลาง' },
    ];

    expect(filterBeanOrderInventoryItems(items)).toEqual([
      { id: '3', name: 'เมล็ดกาแฟคั่วเข้ม' },
      { id: '4', name: 'เมล็ดกาแฟคั่วกลาง' },
      { id: '2', name: 'เมล็ดกาแฟคั่วอ่อน' },
    ]);
  });

  test('omits roast levels missing from inventory', () => {
    const items = [{ id: '3', name: 'เมล็ดกาแฟคั่วเข้ม' }];
    expect(filterBeanOrderInventoryItems(items)).toEqual([
      { id: '3', name: 'เมล็ดกาแฟคั่วเข้ม' },
    ]);
  });

  test('exports exactly three allowed names', () => {
    expect(BEAN_ORDER_INVENTORY_ITEM_NAMES).toEqual([
      'เมล็ดกาแฟคั่วเข้ม',
      'เมล็ดกาแฟคั่วกลาง',
      'เมล็ดกาแฟคั่วอ่อน',
    ]);
  });
});
