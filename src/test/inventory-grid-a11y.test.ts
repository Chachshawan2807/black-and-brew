import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  getInventoryCellAriaLabel,
  getInventoryCellInputName,
  getInventoryCountInputName,
} from '@/lib/inventory-grid-cell-a11y';

const inventoryClientPath = path.resolve(
  __dirname,
  '../app/[locale]/inventory/InventoryClient.tsx',
);
const inventoryCountClientPath = path.resolve(
  __dirname,
  '../app/[locale]/inventory/count/InventoryCountClient.tsx',
);
const inventoryGridSearchBarPath = path.resolve(
  __dirname,
  '../app/[locale]/inventory/_components/InventoryGridSearchBar.tsx',
);
const pinGatewayPath = path.resolve(__dirname, '../components/auth/PinGateway.tsx');
const roundedSelectPath = path.resolve(__dirname, '../components/ui/rounded-select.tsx');

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

  test('builds stable count/adjust input names', () => {
    expect(getInventoryCountInputName('item-42', 'count')).toBe('inventory-count-item-42');
    expect(getInventoryCountInputName('item-42', 'adjust')).toBe('inventory-adjust-item-42');
  });

  test('EditableCell and MobileEditableCell wire a11y props into inputs', () => {
    const source = fs.readFileSync(inventoryClientPath, 'utf-8');

    expect(source).toContain("from '@/lib/inventory-grid-cell-a11y'");
    expect(source).toMatch(/function EditableCell[\s\S]*cellA11yProps/);
    expect(source).toMatch(/function MobileEditableCell[\s\S]*cellA11yProps/);
    expect(source).toMatch(/\{\.\.\.cellA11yProps\}/);
  });

  test('MobileSortableRow raw name/unit/source inputs use getInventoryCellInputName', () => {
    const source = fs.readFileSync(inventoryClientPath, 'utf-8');
    const mobileRow = source.match(
      /const MobileSortableRow = React\.memo\([\s\S]*?MobileSortableRow\.displayName/,
    )?.[0];
    expect(mobileRow).toBeTruthy();
    expect(mobileRow).toContain("getInventoryCellInputName(item.id, 'name')");
    expect(mobileRow).toContain("getInventoryCellInputName(item.id, 'unit')");
    expect(mobileRow).toContain("getInventoryCellInputName(item.id, 'source')");
  });

  test('EditableSortIndex input has a stable name attribute', () => {
    const source = fs.readFileSync(inventoryClientPath, 'utf-8');
    expect(source).toMatch(
      /data-testid="sort-order-input"[\s\S]{0,250}name=\{getInventoryCellInputName\(id,\s*'sort_order'\)\}/,
    );
  });

  test('InventoryCountClient wires count/adjust input names', () => {
    const source = fs.readFileSync(inventoryCountClientPath, 'utf-8');
    expect(source).toContain('getInventoryCountInputName');
    expect(source).toMatch(/name=\{getInventoryCountInputName\(itemId,\s*'count'\)\}/);
    expect(source).toMatch(/name=\{getInventoryCountInputName\(itemId,\s*'adjust'\)\}/);
  });

  test('InventoryGridSearchBar input has name or id', () => {
    const source = fs.readFileSync(inventoryGridSearchBarPath, 'utf-8');
    expect(source).toMatch(/<(input)\b[\s\S]*?\b(?:name|id)=/);
  });

  test('PinGateway PIN input has name or id for autofill diagnostics', () => {
    const source = fs.readFileSync(pinGatewayPath, 'utf-8');
    expect(source).toContain('id="bb-pin-gateway"');
    expect(source).toContain('name="bb-pin"');
    expect(source).toContain('autoComplete="one-time-code"');
  });

  test('RoundedSelect always assigns id or name on the native select', () => {
    const source = fs.readFileSync(roundedSelectPath, 'utf-8');
    expect(source).toContain('const resolvedName = name ??');
    expect(source).toContain('name={resolvedName}');
    expect(source).toContain('id={`${resolvedId}-native`}');
  });
});
