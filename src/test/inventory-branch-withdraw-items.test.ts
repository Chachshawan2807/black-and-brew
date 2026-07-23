import { describe, expect, test } from 'vitest';
import {
  buildBranchWithdrawDisplayItems,
  getAvailableBranchWithdrawPickItems,
} from '@/lib/inventory-branch-withdraw-items';
import { BRANCH_WITHDRAW_ORDER_SOURCE } from '@/lib/inventory-stock';

const allItems = [
  {
    id: 'branch-low',
    name: 'นม',
    stock: 2,
    order_point: 5,
    target_stock: 10,
    source: BRANCH_WITHDRAW_ORDER_SOURCE,
    unit: 'ลิตร',
    sort_order: 1,
  },
  {
    id: 'branch-ok',
    name: 'ชา',
    stock: 20,
    order_point: 5,
    target_stock: 10,
    source: BRANCH_WITHDRAW_ORDER_SOURCE,
    unit: 'ถุง',
    sort_order: 2,
  },
  {
    id: 'makro-low',
    name: 'กาแฟ',
    stock: 1,
    order_point: 5,
    target_stock: 10,
    source: 'Makro',
    unit: 'กก.',
    sort_order: 3,
  },
];

describe('inventory branch withdraw items', () => {
  test('buildBranchWithdrawDisplayItems includes auto branch-2 PO items', () => {
    const items = buildBranchWithdrawDisplayItems(allItems, []);
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe('branch-low');
    expect(items[0]?.isManual).toBe(false);
    expect(items[0]?.computedOrderQty).toBe(8);
  });

  test('buildBranchWithdrawDisplayItems appends manual warehouse items', () => {
    const items = buildBranchWithdrawDisplayItems(allItems, ['makro-low']);
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.id)).toEqual(['branch-low', 'makro-low']);
    expect(items[1]?.isManual).toBe(true);
    expect(items[1]?.computedOrderQty).toBe(0);
  });

  test('buildBranchWithdrawDisplayItems ignores extra ids already in auto list', () => {
    const items = buildBranchWithdrawDisplayItems(allItems, ['branch-low', 'makro-low']);
    expect(items).toHaveLength(2);
    expect(items.filter((item) => item.isManual)).toHaveLength(1);
  });

  test('getAvailableBranchWithdrawPickItems excludes displayed items', () => {
    const displayed = new Set(['branch-low']);
    const available = getAvailableBranchWithdrawPickItems(allItems, displayed);
    expect(available.map((item) => item.id)).toEqual(['branch-ok', 'makro-low']);
  });
});
