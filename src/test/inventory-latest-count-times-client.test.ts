import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

describe('inventory latest stock change times client', () => {
  test('reads stock-change audit events via authenticated supabase client', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../lib/inventory-latest-count-times-client.ts'),
      'utf-8',
    );

    expect(source).toContain('data_change_logs');
    expect(source).toContain('field_changes');
    expect(source).toContain('buildLatestStockChangedAtByItemId');
    expect(source).toContain('ensureSupabaseSession');
    expect(source).toContain(".eq('module', 'inventory')");
    expect(source).toContain(".eq('status', 'success')");
    expect(source).not.toContain(".contains('field_changes'");
    expect(source).toContain(".eq('entity_type', 'inventory_item')");
    expect(source).not.toContain("'use server'");
  });
});
