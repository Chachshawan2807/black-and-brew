import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';
import { resolveRecordedStockChange } from '@/lib/inventory-transaction-result';

describe('resolveRecordedStockChange', () => {
  test('uses old_stock from RPC when present (OUT)', () => {
    expect(
      resolveRecordedStockChange({ old_stock: 4, new_stock: 3 }, 'OUT', 1),
    ).toEqual({ oldStock: 4, newStock: 3 });
  });

  test('uses old_stock from RPC when present (IN)', () => {
    expect(
      resolveRecordedStockChange({ old_stock: 0, new_stock: 2 }, 'IN', 2),
    ).toEqual({ oldStock: 0, newStock: 2 });
  });

  test('reconstructs previous balance when RPC omits old_stock on OUT', () => {
    // Regression: notifications showed "คงเหลือ: 0 → 3" after OUT −1
    expect(
      resolveRecordedStockChange({ new_stock: 3, balance_after: 3 }, 'OUT', 1),
    ).toEqual({ oldStock: 4, newStock: 3 });
  });

  test('reconstructs previous balance when RPC omits old_stock on IN', () => {
    expect(
      resolveRecordedStockChange({ new_stock: 6 }, 'IN', 6),
    ).toEqual({ oldStock: 0, newStock: 6 });
  });

  test('falls back to balance_after when new_stock missing', () => {
    expect(
      resolveRecordedStockChange({ balance_after: 10 }, 'OUT', 2),
    ).toEqual({ oldStock: 12, newStock: 10 });
  });
});

describe('record_inventory_transaction SQL contract', () => {
  test('RPC JSON result includes old_stock for audit/notifications', () => {
    const sql = fs.readFileSync(
      path.resolve(__dirname, '../../sql/record_inventory_transaction.sql'),
      'utf-8',
    );

    expect(sql).toMatch(/'old_stock'\s*,\s*v_current_stock/);
    expect(sql).toMatch(/'new_stock'\s*,\s*v_new_stock/);
  });

  test('RPC accepts optional p_transaction_at for business date', () => {
    const sql = fs.readFileSync(
      path.resolve(__dirname, '../../sql/record_inventory_transaction.sql'),
      'utf-8',
    );

    expect(sql).toContain('p_transaction_at TIMESTAMPTZ');
    expect(sql).toContain('transaction_at');
  });

  test('inventory actions pass transactionAt to RPC', () => {
    const actions = fs.readFileSync(
      path.resolve(__dirname, '../app/actions/inventory-actions.ts'),
      'utf-8',
    );

    expect(actions).toContain('p_transaction_at: auditOptions?.transactionAt');
  });
});
