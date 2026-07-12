import { describe, expect, test } from 'vitest';
import {
  filterInventoryQuickSearchInWorker,
  processInventoryGridView,
  shouldUseInventoryTableWorker,
  sortInventoryGridItems,
} from '@/lib/inventory-table-ops';

describe('inventory-table-ops', () => {
  const items = Array.from({ length: 5 }, (_, i) => ({
    id: String(i),
    name: i === 0 ? 'กาแฟอาราบิก้า' : `item-${i}`,
    sort_order: 5 - i,
    unit: 'kg',
  }));

  test('shouldUseInventoryTableWorker enables worker at threshold', () => {
    expect(shouldUseInventoryTableWorker(59)).toBe(false);
    expect(shouldUseInventoryTableWorker(60)).toBe(true);
  });

  test('sortInventoryGridItems orders by sort_order ascending', () => {
    const sorted = sortInventoryGridItems(items);
    expect(sorted.map((i) => i.sort_order)).toEqual([1, 2, 3, 4, 5]);
  });

  test('processInventoryGridView filters then sorts', () => {
    const result = processInventoryGridView(items, 'กาแฟ');
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('กาแฟอาราบิก้า');
  });

  test('processInventoryGridView returns sorted full list for blank query', () => {
    const result = processInventoryGridView(items, '');
    expect(result.map((i) => i.sort_order)).toEqual([1, 2, 3, 4, 5]);
  });

  test('filterInventoryQuickSearchInWorker respects exclude ids and limit', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      name: `coffee-${i}`,
      sort_order: i + 1,
    }));
    const filtered = filterInventoryQuickSearchInWorker(many, 'coffee', 5, ['0', '1']);
    expect(filtered).toHaveLength(5);
    expect(filtered.every((item) => !['0', '1'].includes(item.id))).toBe(true);
  });
});
