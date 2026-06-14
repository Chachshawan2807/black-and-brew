import { describe, expect, test } from 'vitest';
import {
  filterInventoryQuickSearchItems,
  shouldShowQuickSearchSuggestions,
} from '@/lib/inventory-quick-search-filter';

describe('inventory-quick-search-filter', () => {
  const items = [
    { id: '1', name: 'กาแฟอาราบิก้า', stock: 5, unit: 'kg' },
    { id: '2', name: 'นมสด', stock: 10, unit: 'L' },
    { id: '3', name: 'Espresso Beans', stock: 2, unit: 'kg' },
  ];

  test('filters immediately on partial Thai and English matches', () => {
    expect(filterInventoryQuickSearchItems(items, 'กาแฟ').map((i) => i.name)).toEqual([
      'กาแฟอาราบิก้า',
    ]);
    expect(filterInventoryQuickSearchItems(items, 'esp').map((i) => i.name)).toEqual([
      'Espresso Beans',
    ]);
  });

  test('returns empty for blank query and respects limit', () => {
    expect(filterInventoryQuickSearchItems(items, '   ')).toEqual([]);
    const many = Array.from({ length: 20 }, (_, i) => ({ id: String(i), name: `item-${i}` }));
    expect(filterInventoryQuickSearchItems(many, 'item', 10)).toHaveLength(10);
  });

  test('excludes item ids already in bulk queue', () => {
    expect(
      filterInventoryQuickSearchItems(items, 'กา', 10, ['1']).map((i) => i.name),
    ).toEqual([]);
    expect(
      filterInventoryQuickSearchItems(items, 'นม', 10, ['2']).map((i) => i.name),
    ).toEqual([]);
    expect(filterInventoryQuickSearchItems(items, 'นม', 10, ['1']).map((i) => i.name)).toEqual([
      'นมสด',
    ]);
  });

  test('shouldShowQuickSearchSuggestions requires focus, query, and matches', () => {
    expect(shouldShowQuickSearchSuggestions(true, 'กา', 2)).toBe(true);
    expect(shouldShowQuickSearchSuggestions(false, 'กา', 2)).toBe(false);
    expect(shouldShowQuickSearchSuggestions(true, '  ', 2)).toBe(false);
    expect(shouldShowQuickSearchSuggestions(true, 'กา', 0)).toBe(false);
  });
});
