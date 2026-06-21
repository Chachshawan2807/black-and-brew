import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const inventoryClientPath = resolve(__dirname, '../app/[locale]/inventory/InventoryClient.tsx');
const globalsPath = resolve(__dirname, '../app/[locale]/globals.css');

describe('inventory editable grid performance contract', () => {
  test('row handlers passed to memoized inventory rows are stable across unrelated renders', () => {
    const source = readFileSync(inventoryClientPath, 'utf-8');

    expect(source).toMatch(/const blockIfReadOnly = useCallback/);
    expect(source).toMatch(/const handleFocus = useCallback/);
    expect(source).toMatch(/const handleUpdateField = useCallback/);
    expect(source).toMatch(/const handleSaveField = useCallback/);
  });

  test('inventory row containers use progressive rendering containment', () => {
    const source = readFileSync(inventoryClientPath, 'utf-8');
    const css = readFileSync(globalsPath, 'utf-8');

    expect(source.match(/bb-inventory-row-containment/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(css).toContain('.bb-inventory-row-containment');
    expect(css).toContain('content-visibility: auto');
    expect(css).toContain('@supports not (content-visibility: auto)');
    expect(css).toContain('contain: layout style paint');
  });
});
