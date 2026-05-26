import { expect, test, describe } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually for the test environment
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envText = fs.readFileSync(envPath, 'utf-8');
  envText.split(/\r?\n/).forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key && !key.startsWith('#')) {
        process.env[key] = val;
      }
    }
  });
}

import { runInventoryMigration } from '../app/actions/migrate-inventory-sort-order';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

describe('Inventory Sorting Migration Trigger', () => {
  test('should run the bulk inventory migration successfully', async () => {
    // 1. Run migration
    const result = await runInventoryMigration();
    expect(result.updatedCount + result.insertedCount).toBeGreaterThan(0);

    // 2. Fetch the top 5 items from DB sorted by sort_order
    const supabase = createClient(supabaseUrl, supabaseAdminKey);
    const { data: items, error } = await supabase
      .from('inventory_items')
      .select('name, sort_order, stock')
      .order('sort_order', { ascending: true })
      .limit(5);

    expect(error).toBeNull();
    expect(items).not.toBeNull();
    console.log('Top 5 Migrated Items sorted by sort_order:', items);

    // Verify sort_order sequential behavior (1-based index)
    if (items && items.length > 0) {
      expect(items[0].sort_order).toBe(1);
    }
  }, 45000); // 45s timeout for DB updates
});
