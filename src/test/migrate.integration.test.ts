/**
 * Integration tests — require live Supabase credentials in .env.local.
 * Run manually: npx vitest run src/test/migrate.integration.test.ts
 *
 * Skipped in CI/unit-test runs because they hit the real database.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envText = fs.readFileSync(envPath, 'utf-8');
  envText.split(/\r?\n/).forEach((line) => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key && !key.startsWith('#')) process.env[key] = val;
    }
  });
}

describe.skip('Inventory Migration — integration (requires live DB)', () => {
  it('re-sequences sort_order from real database without CSV', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const { runInventoryMigration } = await import(
      '@/app/actions/migrate-inventory-sort-order'
    );

    const result = await runInventoryMigration();
    expect(result.insertedCount).toBe(0);
    expect(result.updatedCount).toBeGreaterThanOrEqual(0);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: items, error } = await supabase
      .from('inventory_items')
      .select('name, sort_order, stock')
      .order('sort_order', { ascending: true })
      .limit(5);

    expect(error).toBeNull();
    expect(items).not.toBeNull();
    if (items && items.length > 0) {
      expect(items[0].sort_order).toBe(1);
    }
  }, 45000);
});
