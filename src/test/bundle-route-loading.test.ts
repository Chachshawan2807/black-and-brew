import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const inventoryClientPath = resolve(__dirname, '../app/[locale]/inventory/InventoryClient.tsx');
const inventoryHistoryHookPath = resolve(__dirname, '../hooks/use-inventory-history.ts');
const quickActionBarPath = resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionBar.tsx');

describe('bundle and route-level loading', () => {
  test('inventory defers modal-only code behind dynamic imports', () => {
    const source = readFileSync(inventoryClientPath, 'utf-8');

    expect(source).not.toContain("import { InventoryHistoryModal");

    const historyHook = readFileSync(inventoryHistoryHookPath, 'utf-8');
    expect(historyHook).toContain("import type { TransactionHistoryRow }");
    expect(source).toMatch(/dynamic\(\s*\(\)\s*=>\s*import\('\.\/_components\/InventoryHistoryModal'\)/);
    expect(source).toContain("dynamic(() => import('./_components/PurchaseOrdersModal')");
  });

  test('purchase order export surface is not mounted until the modal flow needs it', () => {
    const source = readFileSync(inventoryClientPath, 'utf-8');

    expect(source).toContain('{(showPurchaseOrderModal || isExportingPO) && (');
    expect(source).toContain('blackandbrew-po-table-export');
  });

  test('quick action modal buttons expose intent-based preload hooks', () => {
    const source = readFileSync(quickActionBarPath, 'utf-8');

    expect(source).toContain('onPreloadPurchaseOrder?: () => void');
    expect(source).toContain('onPreloadHistory?: () => void');
    expect(source).toMatch(/onMouseEnter=\{onPreloadPurchaseOrder\}[\s\S]*onFocus=\{onPreloadPurchaseOrder\}/);
    expect(source).toMatch(/onMouseEnter=\{onPreloadHistory\}[\s\S]*onFocus=\{onPreloadHistory\}/);
  });
});
