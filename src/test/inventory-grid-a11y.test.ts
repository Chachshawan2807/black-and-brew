import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  getInventoryCellAriaLabel,
  getInventoryCellInputName,
} from '@/lib/inventory-grid-cell-a11y';

const inventoryClientPath = path.resolve(
  __dirname,
  '../app/[locale]/inventory/InventoryClient.tsx',
);

describe('inventory grid cell a11y helpers', () => {
  test('builds descriptive aria-label from column label and item name', () => {
    expect(getInventoryCellAriaLabel('กาแฟอาราบิก้า', 'คงเหลือ')).toBe(
      'คงเหลือ กาแฟอาราบิก้า',
    );
  });

  test('falls back when item name is empty', () => {
    expect(getInventoryCellAriaLabel('', 'จุดสั่งซื้อ')).toBe('จุดสั่งซื้อ');
  });

  test('builds stable input name from item and column ids', () => {
    expect(getInventoryCellInputName('item-42', 'stock')).toBe('inventory-item-42-stock');
  });

  test('EditableCell and MobileEditableCell wire a11y props into inputs', () => {
    const source = fs.readFileSync(inventoryClientPath, 'utf-8');

    expect(source).toContain("from '@/lib/inventory-grid-cell-a11y'");
    expect(source).toMatch(/function EditableCell[\s\S]*cellA11yProps/);
    expect(source).toMatch(/function MobileEditableCell[\s\S]*cellA11yProps/);
    expect(source).toMatch(/\{\.\.\.cellA11yProps\}/);
  });
});
