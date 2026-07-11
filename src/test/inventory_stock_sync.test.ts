import { describe, expect, test } from 'vitest';
import {
  computeItemsToOrder,
  computeBranchWithdrawItems,
  computeOrderQty,
  formatInventoryNumericDisplay,
  mergeInventoryRealtimeUpdate,
  sanitizeStockValue,
  BRANCH_WITHDRAW_ORDER_SOURCE,
} from '@/lib/inventory-stock';
import { parseLocalColumnWidths } from '@/app/[locale]/inventory/types';

describe('inventory stock sync utilities', () => {
  test('mergeInventoryRealtimeUpdate preserves fields when realtime payload is partial', () => {
    const existing = {
      id: 'item-1',
      name: 'นมสด',
      stock: 5,
      order_point: 10,
      target_stock: 20,
      unit: 'ลิตร',
      source: 'Makro',
      sort_order: 3,
    };

    const partialPayload = {
      id: 'item-1',
      stock: 2,
      updated_at: '2026-06-06T10:00:00.000Z',
    };

    const merged = mergeInventoryRealtimeUpdate(existing, partialPayload);

    expect(merged.stock).toBe(2);
    expect(merged.name).toBe('นมสด');
    expect(merged.order_point).toBe(10);
    expect(merged.target_stock).toBe(20);
    expect(merged.unit).toBe('ลิตร');
  });

  test('computeOrderQty follows DEC-005 formula', () => {
    expect(computeOrderQty(5, 10, 20)).toBe(15);
    expect(computeOrderQty(15, 10, 20)).toBe(0);
    expect(computeOrderQty(0, 0, 0)).toBe(0);
  });

  test('computeItemsToOrder reacts to stock changes for purchase orders', () => {
    const items = [
      { id: '1', name: 'A', stock: 5, order_point: 10, target_stock: 20, unit: 'ชิ้น' },
      { id: '2', name: 'B', stock: 15, order_point: 10, target_stock: 20, unit: 'ชิ้น' },
    ];

    const initial = computeItemsToOrder(items);
    expect(initial).toHaveLength(1);
    expect(initial[0].computedOrderQty).toBe(15);

    const afterStockEdit = computeItemsToOrder(
      items.map((item) => (item.id === '1' ? { ...item, stock: 3 } : item))
    );
    expect(afterStockEdit).toHaveLength(1);
    expect(afterStockEdit[0].computedOrderQty).toBe(17);

    const afterBothBelowPoint = computeItemsToOrder(
      items.map((item) => (item.id === '2' ? { ...item, stock: 8 } : item))
    );
    expect(afterBothBelowPoint).toHaveLength(2);
  });

  test('computeItemsToOrder uses reorder formula for sufficiency checks (ignores manual order_qty)', () => {
    const items = [
      {
        id: 'sufficient-manual',
        name: 'Manual PO',
        stock: 0,
        order_qty: '7',
        order_point: 10,
        target_stock: 20,
        count_policy: 'sufficiency_check',
        unit: 'ชิ้น',
      },
      {
        id: 'sufficient-zero',
        name: 'No PO',
        stock: 100,
        order_qty: '',
        order_point: 0,
        target_stock: 0,
        count_policy: 'sufficiency_check',
        unit: 'ชิ้น',
      },
    ];

    const toOrder = computeItemsToOrder(items);

    expect(toOrder).toHaveLength(1);
    expect(toOrder[0].id).toBe('sufficient-manual');
    expect(toOrder[0].computedOrderQty).toBe(20);
  });

  test('parseLocalColumnWidths preserves persisted px column widths', () => {
    localStorage.setItem(
      'inventory-column-widths',
      JSON.stringify({ stock: '80px', name: '220px', unsafe: '9999px' }),
    );

    expect(parseLocalColumnWidths()).toEqual({
      stock: '80px',
      name: '220px',
    });
  });

  test('sanitizeStockValue never returns NaN', () => {
    expect(sanitizeStockValue('')).toBe(0);
    expect(sanitizeStockValue(null)).toBe(0);
    expect(sanitizeStockValue('12.5')).toBe(12.5);
    expect(sanitizeStockValue('abc')).toBe(0);
  });

  test('formatInventoryNumericDisplay shows zero instead of blank', () => {
    expect(formatInventoryNumericDisplay(0)).toBe('0');
    expect(formatInventoryNumericDisplay('')).toBe('0');
    expect(formatInventoryNumericDisplay(null)).toBe('0');
    expect(formatInventoryNumericDisplay(12)).toBe('12');
  });

  test('computeBranchWithdrawItems matches purchase-order list for สาขา 2 only', () => {
    const items = [
      {
        id: 'branch-low',
        name: 'นม',
        stock: 2,
        order_point: 5,
        target_stock: 10,
        source: BRANCH_WITHDRAW_ORDER_SOURCE,
      },
      {
        id: 'branch-ok',
        name: 'ชา',
        stock: 20,
        order_point: 5,
        target_stock: 10,
        source: BRANCH_WITHDRAW_ORDER_SOURCE,
      },
      {
        id: 'makro-low',
        name: 'กาแฟ',
        stock: 1,
        order_point: 5,
        target_stock: 10,
        source: 'Makro',
      },
    ];

    const branchItems = computeBranchWithdrawItems(items);
    expect(branchItems).toHaveLength(1);
    expect(branchItems[0]?.id).toBe('branch-low');
    expect(branchItems[0]?.computedOrderQty).toBe(8);
  });
});
