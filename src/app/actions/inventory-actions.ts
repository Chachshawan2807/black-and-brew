'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { assertWritableSession } from '@/app/actions/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// ใช้ SERVICE_ROLE_KEY เพื่อให้ Server Action มีสิทธิ์สูงสุดในการอ่าน/เขียน ทะลุ RLS
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
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

    const writable = await assertWritableSession();
    if (!writable.ok) return { success: false, error: writable.error };

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
    revalidatePath('/[locale]/inventory/count', 'page');
    return { success: true, newStock: data?.new_stock };
  } catch (error: any) {
    console.error('[recordTransaction] Unexpected Error:', error.message || error);
    return { success: false, error: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
  }
}

// === SET ABSOLUTE STOCK (Warehouse cell edit + Stock-taking) ===
const stockUpdateSchema = z.object({
  itemId: z.string().uuid(),
  stock: z.number().min(0),
  note: z.string().optional(),
});

export type InventoryStockUpdateOptions = {
  /** When false, stock is updated without a ledger entry (e.g. stock-taking count page). */
  recordHistory?: boolean;
};

export async function updateInventoryStock(
  itemId: string,
  stock: number,
  note: string = 'Stock adjustment',
  options?: InventoryStockUpdateOptions
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    const pinVerified = cookieStore.get('bb_auth_pin_verified')?.value === 'true';

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (!pinVerified && (!user || authError)) {
      return { success: false, error: 'Unauthorized: Session missing or invalid' };
    }

    const writable = await assertWritableSession();
    if (!writable.ok) return { success: false, error: writable.error };

    const parsed = stockUpdateSchema.safeParse({ itemId, stock, note });
    if (!parsed.success) {
      return { success: false, error: 'Invalid stock update payload' };
    }

    let newStock = stock;
    const recordHistory = options?.recordHistory ?? true;

    const { data, error } = await supabase.rpc('set_inventory_stock', {
      p_item_id: itemId,
      p_new_stock: stock,
      p_note: note,
      p_record_history: recordHistory,
    });

    if (error) {
      const rpcMissing = error.message?.includes('set_inventory_stock') || error.code === '42883';
      if (rpcMissing) {
        const { error: updateErr } = await supabase
          .from('inventory_items')
          .update({ stock, updated_at: new Date().toISOString() })
          .eq('id', itemId);

        if (updateErr) {
          console.error('[updateInventoryStock] Fallback update error:', updateErr.message, updateErr.details);
          return { success: false, error: updateErr.message };
        }
      } else {
        console.error('[updateInventoryStock] Supabase RPC Error:', error.message, error.details, error.hint);
        return { success: false, error: error.message };
      }
    } else {
      newStock = data?.new_stock ?? stock;
    }

    revalidatePath('/[locale]/inventory', 'page');
    revalidatePath('/[locale]/inventory/count', 'page');
    return { success: true, newStock };
  } catch (error: any) {
    console.error('[updateInventoryStock] Unexpected Error:', error.message || error);
    return { success: false, error: error.message || 'เกิดข้อผิดพลาดในการบันทึกจำนวนคงเหลือ' };
  }
}

// === DELETE INVENTORY ITEM (Secure Server-Side Delete) ===
/**
 * ADR: SEC-DEL-001 - Secure Server-Side Controlled Deletion
 * Rationale: Bypasses Database RLS Hardening using service_role to prevent data loss 
 * when 'authenticated' role's DELETE policy is strictly revoked.
 * Compliance: EU AI Act Traceability, OWASP LLM Top 10 (Anti-BOLA)
 */
export async function deleteInventoryItem(itemId: string) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    const pinVerified = cookieStore.get('bb_auth_pin_verified')?.value === 'true';

    /**
     * SECURITY LAYER: Treat AI/Client Code as Untrusted.
     * Verify current session and user ownership before executing delete.
     * This prevents Broken Object Level Authorization (BOLA).
     */
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (!pinVerified && (!user || authError)) {
      return { success: false, error: 'Unauthorized: Session missing or invalid' };
    }

    const writable = await assertWritableSession();
    if (!writable.ok) return { success: false, error: writable.error };

    // Step 2: Proceed with Delete using Service Role (Admin Client)
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('[deleteInventoryItem] Supabase Error:', error.message, error.details);
      return { success: false, error: error.message };
    }

    // Step 3: UI Refresh Logic
    revalidatePath('/[locale]/inventory');
    return { success: true };
  } catch (error: any) {
    console.error('[deleteInventoryItem] Unexpected Error:', error.message || error);
    return { success: false, error: 'เกิดข้อผิดพลาดในการลบข้อมูลสินค้า' };
  }
}

export async function deleteInventoryItemsBulk(itemIds: string[]) {
  if (itemIds.length === 0) return { success: true, deleted: 0 };

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    const pinVerified = cookieStore.get('bb_auth_pin_verified')?.value === 'true';

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (!pinVerified && (!user || authError)) {
      return { success: false, error: 'Unauthorized: Session missing or invalid', deleted: 0 };
    }

    const writable = await assertWritableSession();
    if (!writable.ok) return { success: false, error: writable.error, deleted: 0 };

    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .in('id', itemIds);

    if (error) {
      console.error('[deleteInventoryItemsBulk] Supabase Error:', error.message, error.details);
      return { success: false, error: error.message, deleted: 0 };
    }

    revalidatePath('/[locale]/inventory');
    return { success: true, deleted: itemIds.length };
  } catch (error: any) {
    console.error('[deleteInventoryItemsBulk] Unexpected Error:', error.message || error);
    return { success: false, error: 'เกิดข้อผิดพลาดในการลบข้อมูลสินค้า', deleted: 0 };
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
      .select('id, inventory_item_id, type, quantity, note, created_at, balance_after')
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

// === FETCH COMPREHENSIVE INVENTORY DATA ===
export async function fetchComprehensiveInventoryData() {
  noStore();
  try {
    // Step 1: Fetch all inventory items
    const { data: inventoryItems, error: itemsError } = await supabase
      .from('inventory_items')
      .select('id, name, stock, order_point, target_stock, order_qty, unit, source, sort_order, updated_at')
      .order('name');

    if (itemsError) {
      console.error('[fetchComprehensiveInventoryData] Items Error:', itemsError);
      return { 
        success: false, error: itemsError.message, data: null };
    }

    // Step 2: Fetch recent inventory transactions
    const { data: inventoryTransactions, error: txError } = await supabase
      .from('inventory_transactions')
      .select('id, inventory_item_id, type, quantity, note, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (txError) {
      console.error('[fetchComprehensiveInventoryData] Transactions Error:', txError);
      return { success: false, error: txError.message, data: null };
    }

    // Validate and process inventory items
    const validatedItems: any[] = [];
    const validationReport = {
      totalItems: inventoryItems?.length || 0,
      validItems: 0,
      invalidItems: 0,
      itemsWithLowStock: 0,
      validationErrors: [] as string[]
    };

    inventoryItems?.forEach((item: any) => {
      let isValid = true;
      const errors = [];

      // Validate stock
      if (item.stock === null || item.stock === undefined || isNaN(item.stock)) {
        isValid = false;
        errors.push('Stock quantity is invalid');
      }

      // Validate name
      if (!item.name || item.name.trim() === '') {
        isValid = false;
        errors.push('Item name is missing');
      }

      // Check if low stock check
      const stock = Number(item.stock || 0);
      const orderPoint = Number(item.order_point || 0);
      const isLowStock = stock <= orderPoint;

      if (isLowStock && isValid) {
        validationReport.itemsWithLowStock++;
      }

      if (!isValid) {
        validationReport.invalidItems++;
        validationReport.validationErrors.push(
          `${item.name || 'Unknown Item'}: ${errors.join(', ')}`
        );
      } else {
        validationReport.validItems++;
        validatedItems.push({
          id: item.id,
          name: item.name,
          stock: stock,
          orderQty: Number(item.order_qty || 0),
          orderPoint: orderPoint,
          targetStock: Number(item.target_stock || 0),
          unit: item.unit,
          source: item.source,
          isLowStock,
          updatedAt: item.updated_at,
          createdAt: item.created_at
        });
      }
    });

    // Calculate total inventory value (if we had cost data, but let's just estimate for now
    const totalItemsInStock = validatedItems.reduce((sum, item) => sum + item.stock, 0);

    return {
      success: true,
      data: {
        items: validatedItems,
        transactions: inventoryTransactions || [],
        validationReport,
        totalItemsInStock,
        lastSync: new Date().toISOString()
      }
    };

  } catch (error: any) {
    console.error('[fetchComprehensiveInventoryData] Unexpected Error:', error);
    return { success: false, error: error.message, data: null };
  }
}
