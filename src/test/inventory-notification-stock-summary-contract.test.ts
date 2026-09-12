import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

const actionsPath = path.resolve(__dirname, '../app/actions/inventory-actions.ts');
const formatterPath = path.resolve(__dirname, '../lib/inventory-notification-formatter.ts');

function readActions(): string {
  return fs.readFileSync(actionsPath, 'utf-8');
}

function readFormatter(): string {
  return fs.readFileSync(formatterPath, 'utf-8');
}

describe('inventory stock notification audit contract', () => {
  test('stock mutations always log explicit stock field changes', () => {
    const source = readActions();
    expect(source).toContain('function buildStockAuditFieldChanges(');

    const recordTransactionAudit = source.match(
      /deferInventorySideEffects\('recordTransaction'[\s\S]*?\n    \}\);/,
    )?.[0];
    expect(recordTransactionAudit).toBeTruthy();
    expect(recordTransactionAudit).toContain(
      'fieldChanges: buildStockAuditFieldChanges(oldStock, newStock)',
    );

    const updateStockAudit = source.match(
      /deferInventorySideEffects\('updateInventoryStock'[\s\S]*?\n    \}\);/,
    )?.[0];
    expect(updateStockAudit).toBeTruthy();
    expect(updateStockAudit).toContain(
      'fieldChanges: buildStockAuditFieldChanges(oldStock, newStock)',
    );
    expect(updateStockAudit).not.toContain('fieldChanges: computeFieldChanges(');
  });

  test('stock mutations persist newStock in audit metadata', () => {
    const source = readActions();
    expect(source).toMatch(
      /operation: 'record_transaction'[\s\S]*newStock,/,
    );
    expect(source).toMatch(
      /operation: 'set_stock'[\s\S]*newStock,/,
    );
  });

  test('formatter resolves stock level from metadata and never uses generic stock updated copy', () => {
    const source = readFormatter();
    expect(source).toContain('export function resolveNotificationStockLevel(');
    expect(source).toMatch(/meta\.newStock \?\? meta\.new_stock/);
    expect(source).not.toContain('อัปเดตสต็อกแล้ว');
    expect(source).not.toContain("'Stock updated'");
  });
});
