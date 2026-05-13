'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath, unstable_noStore as noStore } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// === RECORD TRANSACTION (Atomic via RPC) ===
export async function recordTransaction(
  productId: string,
  type: 'IN' | 'OUT',
  quantity: number,
  note: string = ''
) {
  try {
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

// === FETCH TRANSACTION HISTORY (Clean Slate v3.1) ===
// Strategy: Two-step fetch (transactions + item names separately)
// This bypasses any FK join issues and RLS complications on related tables.
export async function fetchTransactionHistory(productId?: string, limit: number = 50) {
  noStore();
  try {
    // Step 1: Fetch raw transaction data (no join — bulletproof approach)
    let query = supabase
      .from('inventory_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (productId) {
      query = query.eq('inventory_item_id', productId);
    }

    const { data: transactions, error: txError } = await query;

    if (txError) {
      console.error('[fetchTransactionHistory] Query Error:', txError.message, txError.details, txError.hint);
      return { success: false, error: `DB Error: ${txError.message}`, data: [] };
    }

    if (!transactions || transactions.length === 0) {
      console.log('[fetchTransactionHistory] No transactions found. Table may be empty or RLS may be blocking.');
      return { success: true, data: [] };
    }

    console.log(`[fetchTransactionHistory] Fetched ${transactions.length} raw records.`);

    // Step 2: Get unique item IDs and fetch their names separately
    const itemIds = [...new Set(transactions.map((tx: any) => tx.inventory_item_id).filter(Boolean))];
    
    let itemNameMap: Record<string, string> = {};
    if (itemIds.length > 0) {
      const { data: itemsData, error: itemsError } = await supabase
        .from('inventory_items')
        .select('id, name')
        .in('id', itemIds);

      if (itemsError) {
        console.error('[fetchTransactionHistory] Items Lookup Error:', itemsError.message);
      } else if (itemsData) {
        itemsData.forEach((item: any) => {
          itemNameMap[item.id] = item.name;
        });
      }
    }

    // Step 3: Merge names into transaction data
    const enrichedData = transactions.map((tx: any) => ({
      ...tx,
      inventory_items: { 
        name: itemNameMap[tx.inventory_item_id] || 'ไม่ทราบชื่อสินค้า' 
      }
    }));

    console.log(`[fetchTransactionHistory] Enriched ${enrichedData.length} records with item names.`);
    return { success: true, data: enrichedData };
  } catch (error: any) {
    console.error('[fetchTransactionHistory] Unexpected Error:', error.message || error);
    return { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงประวัติ', data: [] };
  }
}

// === FETCH FREQUENT ITEMS ===
export async function fetchFrequentItems() {
  try {
    const { data, error } = await supabase
      .from('inventory_transactions')
      .select('inventory_item_id')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[fetchFrequentItems] Error:', error.message);
      return { success: true, data: [] };
    }

    if (!data || data.length === 0) return { success: true, data: [] };

    // Count frequencies
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
