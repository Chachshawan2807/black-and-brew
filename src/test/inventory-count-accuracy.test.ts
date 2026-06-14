import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('inventory count accuracy', () => {
  test('migration creates inventory_count_verifications table', () => {
    const sql = fs.readFileSync(
      path.resolve(__dirname, '../../supabase/migrations/20260614120000_inventory_count_verifications.sql'),
      'utf-8',
    );
    expect(sql).toContain('inventory_count_verifications');
    expect(sql).toContain('in_out_theoretical_qty');
    expect(sql).toContain('matched BOOLEAN');
  });

  test('inventory actions export accuracy server functions', () => {
    const actionsCode = fs.readFileSync(
      path.resolve(__dirname, '../app/actions/inventory-actions.ts'),
      'utf-8',
    );
    expect(actionsCode).toContain('computeInOutTheoreticalStock');
    expect(actionsCode).toContain('recordCountVerification');
    expect(actionsCode).toContain('fetchCountAccuracyStats');
    expect(actionsCode).toContain('inventory_count_verifications');
  });

  test('count page loads accuracy stats and records verification', () => {
    const countPage = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/count/InventoryCountClient.tsx'),
      'utf-8',
    );
    expect(countPage).toContain('fetchCountAccuracyStats');
    expect(countPage).toContain('recordCountVerification');
    expect(countPage).toContain('ความแม่นยำการบันทึกรับเข้า/นำออก');
  });
});
