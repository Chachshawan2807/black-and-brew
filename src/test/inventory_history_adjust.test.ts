import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('inventory history adjust type', () => {
  test('count page skips ledger when updating stock', () => {
    const countPage = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/count/page.tsx'),
      'utf-8',
    );

    expect(countPage).toContain('recordHistory: false');
  });

  test('quick action bar includes adjust quantity control with sliders icon', () => {
    const barCode = fs.readFileSync(
      path.resolve(__dirname, '../components/inventory/InventoryQuickActionBar.tsx'),
      'utf-8',
    );

    expect(barCode).toContain("'ADJUST'");
    expect(barCode).toContain('SlidersHorizontal');
    expect(barCode).toContain('ปรับจำนวน');
    expect(barCode).toContain('INVENTORY_QUICK_ACTION_COLORS.adjust');
  });

  test('history modal renders adjust transaction type label', () => {
    const modalCode = fs.readFileSync(
      path.resolve(__dirname, '../components/inventory/InventoryHistoryModal.tsx'),
      'utf-8',
    );

    expect(modalCode).toContain("'ADJUST'");
    expect(modalCode).toContain('ปรับจำนวน');
    expect(modalCode).toContain('SlidersHorizontal');
  });

  test('set_inventory_stock SQL records ADJUST and supports skip flag', () => {
    const sql = fs.readFileSync(
      path.resolve(__dirname, '../../sql/inventory_transaction_adjust.sql'),
      'utf-8',
    );

    expect(sql).toContain("'ADJUST'");
    expect(sql).toContain('p_record_history');
  });
});
