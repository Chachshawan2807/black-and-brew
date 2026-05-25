'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import { cookies } from 'next/headers';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// ใช้ SERVICE_ROLE_KEY เพื่อให้ Server Action มีสิทธิ์สูงสุดในการอ่าน/เขียน ทะลุ RLS
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAdminKey);

// === RECORD TRANSACTION (Atomic via RPC) ===
const transactionSchema = z.object({
  productId: z.string().uuid().or(z.string()),
  type: z.enum(['IN', 'OUT']),
  quantity: z.number().positive(),
  note: z.string().optional()
});

export async function recordTransaction(
  productId: string,
  type: 'IN' | 'OUT',
  quantity: number,
  note: string = ''
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    const pinVerified = cookieStore.get('bb_auth_pin_verified')?.value === 'true';

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (!pinVerified && (!user || authError)) {
      return { success: false, error: 'Unauthorized: Session missing or invalid' };
    }

    const parsed = transactionSchema.safeParse({ productId, type, quantity, note });
    if (!parsed.success) {
      return { success: false, error: 'Invalid transaction payload' };
    }

    if (quantity <= 0) {
      return { success: false, error: 'Quantity must be greater than 0' };
    }

    const { data, error } = await supabase.rpc('record_inventory_transaction', {
      p_product_id: productId,
      p_type: type,
      p_quantity: quantity,
      p_note: note
    });

    if (error) {
      console.error('[recordTransaction] Supabase RPC Error:', error.message, error.details, error.hint);
      if (error.message.includes('Insufficient stock')) {
        return { success: false, error: 'ยอดคงเหลือไม่เพียงพอสำหรับการนำออก' };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/[locale]/inventory', 'page');
    return { success: true, newStock: data?.new_stock };
  } catch (error: any) {
    console.error('[recordTransaction] Unexpected Error:', error.message || error);
    return { success: false, error: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
  }
}

// === FETCH TRANSACTION HISTORY (SPEC 3.1 — Two-Step Fetch) ===
// Column: inventory_item_id (VERIFIED via Supabase Dashboard — DO NOT CHANGE)
// Strategy: Two-step fetch (transactions -> item names -> merge in code)
export async function fetchTransactionHistory(itemId?: string, limit: number = 50) {
  noStore(); // Phase 1: Force disable cache — always fetch fresh from DB

  try {
    // Step 1: Fetch raw transaction data (no join — bulletproof approach)
    // Uses inventory_item_id — VERIFIED column name in actual DB
    let query = supabase
      .from('inventory_transactions')
      .select('id, inventory_item_id, type, quantity, note, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (itemId) {
      query = query.eq('inventory_item_id', itemId);
    }

    const { data: transactions, error: txError } = await query;

    if (txError) {
      console.error('[fetchTransactionHistory] Supabase Deep Error:', txError);
      console.error('[fetchTransactionHistory] Details:', txError.message, txError.details, txError.hint);
      return { success: false, error: `DB Error: ${txError.message}`, data: [] };
    }

    if (!transactions || transactions.length === 0) {
      return { success: true, data: [] };
    }

    // Step 2: Get unique item IDs and fetch their names separately
    // Uses inventory_item_id — VERIFIED column name in actual DB
    const itemIds = [...new Set(
      transactions.map((tx: any) => tx.inventory_item_id).filter(Boolean)
    )] as string[];

    let itemNameMap: Record<string, string> = {};

    if (itemIds.length > 0) {
      const { data: itemsData, error: itemsError } = await supabase
        .from('inventory_items')
        .select('id, name')
        .in('id', itemIds);

      if (itemsError) {
        console.error('[fetchTransactionHistory] Items Lookup Error:', itemsError);
      } else if (itemsData) {
        itemsData.forEach((item: any) => {
          itemNameMap[item.id] = item.name;
        });
      }
    }

    // Step 3: Merge names into transaction data
    // Uses inventory_item_id — VERIFIED column name in actual DB
    const enrichedData = transactions.map((tx: any) => ({
      ...tx,
      inventory_items: {
        name: itemNameMap[tx.inventory_item_id] || 'ไม่ทราบชื่อสินค้า'
      }
    }));

    return { success: true, data: enrichedData };
  } catch (error: any) {
    console.error('[fetchTransactionHistory] Unexpected Error:', error.message || error);
    return { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงประวัติ', data: [] };
  }
}

// === FETCH FREQUENT ITEMS ===
// Uses inventory_item_id — VERIFIED column name in actual DB
export async function fetchFrequentItems() {
  try {
    const { data, error } = await supabase
      .from('inventory_transactions')
      .select('inventory_item_id')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[fetchFrequentItems] Supabase Deep Error:', error);
      return { success: true, data: [] };
    }

    if (!data || data.length === 0) return { success: true, data: [] };

    // Count frequencies using inventory_item_id — VERIFIED column name in actual DB
    const counts: Record<string, number> = {};
    data.forEach((tx: any) => {
      const id = tx.inventory_item_id;
      if (id) counts[id] = (counts[id] || 0) + 1;
    });

    // Get top 5 IDs
    const topIds = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);

    if (topIds.length === 0) return { success: true, data: [] };

    // Fetch names for top items
    const { data: itemsData, error: itemsError } = await supabase
      .from('inventory_items')
      .select('id, name')
      .in('id', topIds);

    if (itemsError || !itemsData) return { success: true, data: [] };

    const result = topIds
      .map(id => {
        const item = itemsData.find((i: any) => i.id === id);
        return item ? { id: item.id as string, name: item.name as string } : null;
      })
      .filter((x): x is { id: string; name: string } => x !== null);

    return { success: true, data: result };
  } catch (error: any) {
    console.error('[fetchFrequentItems] Unexpected Error:', error.message);
    return { success: false, error: error.message };
  }
}
