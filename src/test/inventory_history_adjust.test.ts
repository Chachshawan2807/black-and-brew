import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('inventory history adjust type', () => {
  test('count page skips ledger when updating stock', () => {
    const countPage = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/count/InventoryCountClient.tsx'),
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
    expect(barCode).toContain('aria-pressed={quickType === \'IN\'}');
    expect(barCode).not.toMatch(/PackagePlus[\s\S]*text-foreground\/40/);
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

describe('inventory history add and delete types', () => {
  test('history modal renders add and delete transaction type labels', () => {
    const modalCode = fs.readFileSync(
      path.resolve(__dirname, '../components/inventory/InventoryHistoryModal.tsx'),
      'utf-8',
    );

    expect(modalCode).toContain("'ADD'");
    expect(modalCode).toContain("'DELETE'");
    expect(modalCode).toContain('เพิ่มรายการ');
    expect(modalCode).toContain('ลบรายการ');
  });

  test('inventory actions record ADD ledger on create and DELETE before item removal', () => {
    const actionsCode = fs.readFileSync(
      path.resolve(__dirname, '../app/actions/inventory-actions.ts'),
      'utf-8',
    );

    expect(actionsCode).toContain('recordItemAddHistory');
    expect(actionsCode).toContain("'ADD'");
    expect(actionsCode).toContain("'DELETE'");
    expect(actionsCode).toContain('inventory_transactions');
  });

  test('add item modal records ADD history after insert', () => {
    const modalCode = fs.readFileSync(
      path.resolve(__dirname, '../components/inventory/InventoryAddItemModal.tsx'),
      'utf-8',
    );

    expect(modalCode).toContain('recordItemAddHistory');
  });

  test('inventory page records ADD history after insert', () => {
    const pageCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/InventoryClient.tsx'),
      'utf-8',
    );

    expect(pageCode).toContain('recordItemAddHistory');
  });

  test('SQL migration allows ADD and DELETE transaction types', () => {
    const sql = fs.readFileSync(
      path.resolve(__dirname, '../../sql/inventory_transaction_add_delete.sql'),
      'utf-8',
    );

    expect(sql).toContain("'ADD'");
    expect(sql).toContain("'DELETE'");
    expect(sql).toContain('ON DELETE SET NULL');
  });
});
