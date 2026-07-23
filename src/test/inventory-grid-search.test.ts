import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { filterInventoryGridItems, getInventoryItemDisplayOrder } from '@/lib/inventory-grid-search';

const inventoryClientPath = resolve(
  __dirname,
  '../app/[locale]/inventory/InventoryClient.tsx',
);
const globalsCssPath = resolve(__dirname, '../app/[locale]/globals.css');

describe('inventory-grid-search', () => {
  const items = [
    { id: '1', name: 'กาแฟอาราบิก้า', unit: 'kg' },
    { id: '2', name: 'นมสด', unit: 'L' },
    { id: '3', name: 'Espresso Beans', unit: 'kg' },
  ];

  test('returns all items when query is blank', () => {
    expect(filterInventoryGridItems(items, '')).toEqual(items);
    expect(filterInventoryGridItems(items, '   ')).toEqual(items);
  });

  test('filters all matching items without limit', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      name: `item-${i}`,
      unit: 'pcs',
    }));
    expect(filterInventoryGridItems(many, 'item')).toHaveLength(20);
    expect(filterInventoryGridItems(items, 'กาแฟ').map((i) => i.name)).toEqual([
      'กาแฟอาราบิก้า',
    ]);
    expect(filterInventoryGridItems(items, 'esp').map((i) => i.name)).toEqual([
      'Espresso Beans',
    ]);
  });

  test('getInventoryItemDisplayOrder uses sort_order, not filtered index', () => {
    expect(getInventoryItemDisplayOrder({ sort_order: 12 }, 0)).toBe(12);
    expect(getInventoryItemDisplayOrder({ sort_order: 0 }, 4)).toBe(5);
    expect(getInventoryItemDisplayOrder({}, 2)).toBe(3);
  });

  test('filtered rows keep real sort_order for display numbering', () => {
    const source = readFileSync(inventoryClientPath, 'utf-8');
    expect(source).toContain('getInventoryItemDisplayOrder');
    expect(source).not.toMatch(/displayIndex=\{index \+ 1\}/);
  });

  test('dark theme keeps distinct lg and xl shadow tiers', () => {
    const source = readFileSync(globalsCssPath, 'utf-8');
    expect(source).toMatch(/\.dark \.bb-shadow-lg\s*\{[\s\S]*?0 24px 48px -10px/);
    expect(source).toMatch(/\.dark \.bb-shadow-xl\s*\{[\s\S]*?0 28px 56px -12px/);
    expect(source).not.toMatch(/\.dark \.bb-shadow-lg,\s*\n\s*\.dark \.bb-shadow-xl/);
  });
});
