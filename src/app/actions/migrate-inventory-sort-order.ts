'use server';

import { createClient } from '@supabase/supabase-js';
import { assertWritableSession } from '@/app/actions/auth';
import { ensureServerSession, requireServiceRoleKey } from '@/lib/security/server-auth';

/**
 * Re-sequences sort_order for all inventory_items (1-based) using current DB order.
 * CSV dependency removed — stock is never overwritten from external files.
 */
export async function runInventoryMigration() {
  const auth = await ensureServerSession();
  if (!auth.ok) {
    throw new Error(auth.error);
  }

  const writable = await assertWritableSession();
  if (!writable.ok) {
    throw new Error(writable.error);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAdminKey = requireServiceRoleKey();
  const supabase = createClient(supabaseUrl, supabaseAdminKey);

  const { data: dbItems, error: fetchErr } = await supabase
    .from('inventory_items')
    .select('id, sort_order')
    .order('sort_order', { ascending: true });

  if (fetchErr) {
    console.error('Fetch error:', fetchErr);
    throw fetchErr;
  }

  if (!dbItems || dbItems.length === 0) {
    return { updatedCount: 0, insertedCount: 0 };
  }

  let updatedCount = 0;

  for (let index = 0; index < dbItems.length; index++) {
    const item = dbItems[index];
    const sortOrder = index + 1;

    if (item.sort_order === sortOrder) continue;

    const { error: updateErr } = await supabase
      .from('inventory_items')
      .update({ sort_order: sortOrder })
      .eq('id', item.id);

    if (updateErr) {
      console.error(`Failed to update sort_order for ${item.id}:`, updateErr.message);
    } else {
      updatedCount++;
    }
  }

  return { updatedCount, insertedCount: 0 };
}
