import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const inventoryClient = fs.readFileSync(
  path.resolve(__dirname, '../app/[locale]/inventory/InventoryClient.tsx'),
  'utf-8',
);
const quickActionBar = fs.readFileSync(
  path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionBar.tsx'),
  'utf-8',
);
const blurHelper = fs.readFileSync(
  path.resolve(__dirname, '../lib/inventory-grid-cell-blur.ts'),
  'utf-8',
);

describe('inventory warehouse page mobile commit', () => {
  test('inventory page mounts inline quick action bar with shared mobile controls', () => {
    expect(inventoryClient).toContain('InventoryQuickActionBar');
    expect(inventoryClient).toMatch(/isQuickActionBarOpen && !quickActionFabOpen/);
    expect(inventoryClient).toContain('QUICK_ACTION_BAR');
  });

  test('mobile grid cells defer blur commit when focus moves between spreadsheet inputs', () => {
    expect(inventoryClient).toContain('scheduleInventoryGridCellBlur');
    expect(inventoryClient).toMatch(/MobileEditableCell[\s\S]*siblingDatasetKey: 'mobileColId'/);
    expect(inventoryClient).toMatch(/function EditableCell[\s\S]*siblingDatasetKey: 'colId'/);
    expect(blurHelper).toContain('window.setTimeout');
    expect(blurHelper).toContain('active.dataset[params.siblingDatasetKey]');
  });

  test('mobile stock inputs expose done key hint for iOS/Android keyboards', () => {
    expect(inventoryClient).toMatch(
      /MobileEditableCell[\s\S]*enterKeyHint=\{col\.type === 'number' \? 'done' : 'next'\}/,
    );
  });

  test('inline and FAB quick action save blurs focused grid cells before submit', () => {
    expect(quickActionBar).toMatch(
      /function QuickActionSaveButton[\s\S]*blurActiveElement\(\)[\s\S]*setTimeout[\s\S]*onSubmit/,
    );
  });
});
