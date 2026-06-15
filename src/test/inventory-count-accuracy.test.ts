import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';
import { isCountMatch } from '@/lib/inventory-count-accuracy';

describe('inventory count accuracy', () => {
  test('isCountMatch compares counted qty against system stock', () => {
    expect(isCountMatch(10, 10)).toBe(true);
    expect(isCountMatch(10, 9)).toBe(false);
    expect(isCountMatch(0, 0)).toBe(true);
  });

  test('migration resets legacy rows and renames baseline column', () => {
    const sql = fs.readFileSync(
      path.resolve(__dirname, '../../supabase/migrations/20260615120000_inventory_count_accuracy_refactor.sql'),
      'utf-8',
    );
    expect(sql).toContain('DELETE FROM public.inventory_count_verifications');
    expect(sql).toContain('system_stock_qty');
  });

  test('inventory actions compare count against system stock', () => {
    const actionsCode = fs.readFileSync(
      path.resolve(__dirname, '../app/actions/inventory-actions.ts'),
      'utf-8',
    );
    expect(actionsCode).toContain('isCountMatch');
    expect(actionsCode).toContain('recordCountVerification');
    expect(actionsCode).toContain('fetchCountAccuracyStats');
    expect(actionsCode).toContain('system_stock_qty');
    expect(actionsCode).toContain(".select('stock')");
    expect(actionsCode).not.toContain('computeInOutTheoreticalStockForItem');
    expect(actionsCode).not.toMatch(/recordCountVerification\([\s\S]*systemStockQty\?:/);
  });

  test('count page shows total and item-level accuracy with empty count inputs', () => {
    const countPage = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/count/InventoryCountClient.tsx'),
      'utf-8',
    );
    expect(countPage).toContain('fetchCountAccuracyStats');
    expect(countPage).toContain('recordCountVerification');
    expect(countPage).toContain('Promise.all');
    expect(countPage).toContain('void loadAccuracyStats');
    expect(countPage).toContain('ค่าความแม่นยำรวม');
    expect(countPage).toContain('Total Accuracy');
    expect(countPage).toContain('Item-level Accuracy');
    expect(countPage).toContain('placeholder="จำนวน"');
    expect(countPage).not.toContain('fetchInOutTheoreticalQtyMap');
    expect(countPage).not.toContain('ความแม่นยำการบันทึกรับเข้า/นำออก');
    expect(countPage).not.toContain('ตามบันทึก IN/OUT');
  });

  test('main inventory page does not record count verifications on manual stock edits', () => {
    const inventoryPage = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/InventoryClient.tsx'),
      'utf-8',
    );
    expect(inventoryPage).not.toContain('recordCountVerification');
  });
});
