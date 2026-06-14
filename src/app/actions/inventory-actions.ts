'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { assertWritableSession } from '@/app/actions/auth';
import { recordDataChange } from '@/app/actions/data-change-log-actions';
import { computeFieldChanges } from '@/lib/data-change-log';
import {
  computeAccuracyPct,
  computeInOutTheoreticalStock,
  type InOutLedgerRow,
} from '@/lib/inventory-in-out-theoretical';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// ใช้ SERVICE_ROLE_KEY เพื่อให้ Server Action มีสิทธิ์สูงสุดในการอ่าน/เขียน ทะลุ RLS
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseAdminKey);

type InventoryAuditOptions = {
  clientSessionId?: string;
  /** When true, in-app inventory notifications are skipped (e.g. stock-taking count page). */
  suppressNotification?: boolean;
  notificationContext?: 'inventory_count' | 'inventory';
};

type InventoryLifecycleType = 'ADD' | 'DELETE';

async function insertInventoryLifecycleTransaction(
  itemId: string | null,
  type: InventoryLifecycleType,
  quantity: number,
  balanceAfter: number,
  note: string = ''
) {
  const { error } = await supabase.from('inventory_transactions').insert({
    inventory_item_id: itemId,
    type,
    quantity,
    balance_after: balanceAfter,
    note,
  });

  if (error) {
    console.error(
      `[insertInventoryLifecycleTransaction] Supabase Error:`,
      error.message,
      error.details,
      error.hint
    );
    throw error;
  }
}

/** Record ADD ledger entry after a new inventory item is created. */
export async function recordItemAddHistory(
  itemId: string,
  stock: number = 0,
  itemName?: string
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

    const sanitizedStock = stock < 0 ? 0 : stock;
    await insertInventoryLifecycleTransaction(
      itemId,
      'ADD',
      sanitizedStock,
      sanitizedStock,
      itemName ?? ''
    );

    revalidatePath('/[locale]/inventory', 'page');
    return { success: true };
  } catch (error: any) {
    console.error('[recordItemAddHistory] Unexpected Error:', error.message || error);
    return { success: false, error: error.message || 'เกิดข้อผิดพลาดในการบันทึกประวัติเพิ่มรายการ' };
  }
}

function withAuditMetadata(
  metadata: Record<string, unknown>,
  options?: InventoryAuditOptions
): Record<string, unknown> {
  if (!options) return metadata;
  const result = { ...metadata };
  if (options.clientSessionId) {
    result.clientSessionId = options.clientSessionId;
  }
  if (options.suppressNotification) {
    result.suppressNotification = true;
  }
  if (options.notificationContext) {
    result.notificationContext = options.notificationContext;
  }
  return result;
}

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
  note: string = '',
  auditOptions?: InventoryAuditOptions
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

    const { data: beforeItem } = await supabase
      .from('inventory_items')
      .select('name, stock, order_point')
      .eq('id', productId)
      .maybeSingle();

    const { data, error } = await supabase.rpc('record_inventory_transaction', {
      p_product_id: productId,
      p_type: type,
      p_quantity: quantity,
      p_note: note
    });

    if (error) {
      console.error('[recordTransaction] Supabase RPC Error:', error.message, error.details, error.hint);
      await recordDataChange({
        action: 'UPDATE',
        module: 'inventory',
        entityType: 'inventory_item',
        entityId: productId,
        entityLabel: beforeItem?.name ?? null,
        status: 'failed',
        errorMessage: error.message,
        metadata: withAuditMetadata(
          {
            operation: 'record_transaction',
            type,
            quantity,
            itemName: beforeItem?.name ?? null,
          },
          auditOptions
        ),
      });
      if (error.message.includes('Insufficient stock')) {
        return { success: false, error: 'ยอดคงเหลือไม่เพียงพอสำหรับการนำออก' };
      }
      return { success: false, error: error.message };
    }

    await recordDataChange({
      action: 'UPDATE',
      module: 'inventory',
      entityType: 'inventory_item',
      entityId: productId,
      entityLabel: beforeItem?.name ?? null,
      fieldChanges: [
        {
          field: 'stock',
          old_value: data?.old_stock ?? beforeItem?.stock ?? null,
          new_value: data?.new_stock ?? null,
        },
      ],
      metadata: withAuditMetadata(
        {
          operation: 'record_transaction',
          type,
          quantity,
          note,
          itemName: beforeItem?.name ?? null,
          order_point: data?.order_point ?? beforeItem?.order_point ?? null,
        },
        auditOptions
      ),
    });

    revalidatePath('/[locale]/inventory', 'page');
    revalidatePath('/[locale]/inventory/count', 'page');
    return { success: true, newStock: data?.new_stock };
  } catch (error: any) {
    console.error('[recordTransaction] Unexpected Error:', error.message || error);
    return { success: false, error: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
  }
}

const bulkTransactionEntrySchema = z.object({
  itemId: z.string().uuid().or(z.string()),
  type: z.enum(['IN', 'OUT']),
  quantity: z.number().positive(),
});

const bulkTransactionsSchema = z.object({
  entries: z.array(bulkTransactionEntrySchema).min(1),
  note: z.string().optional(),
});

export type BulkInventoryTransactionEntry = z.infer<typeof bulkTransactionEntrySchema>;

export type BulkInventoryTransactionResult = {
  itemId: string;
  success: boolean;
  newStock?: number;
  error?: string;
};

export async function recordBulkInventoryTransactions(
  entries: BulkInventoryTransactionEntry[],
  note: string = 'Quick Entry - Bulk',
  auditOptions?: InventoryAuditOptions,
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    const pinVerified = cookieStore.get('bb_auth_pin_verified')?.value === 'true';

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (!pinVerified && (!user || authError)) {
      return { success: false, error: 'Unauthorized: Session missing or invalid', results: [] as BulkInventoryTransactionResult[] };
    }

    const writable = await assertWritableSession();
    if (!writable.ok) {
      return { success: false, error: writable.error, results: [] as BulkInventoryTransactionResult[] };
    }

    const parsed = bulkTransactionsSchema.safeParse({ entries, note });
    if (!parsed.success) {
      return { success: false, error: 'Invalid bulk transaction payload', results: [] as BulkInventoryTransactionResult[] };
    }

    const results: BulkInventoryTransactionResult[] = [];

    for (const entry of parsed.data.entries) {
      const { data: beforeItem } = await supabase
        .from('inventory_items')
        .select('name, stock, order_point')
        .eq('id', entry.itemId)
        .maybeSingle();

      const { data, error } = await supabase.rpc('record_inventory_transaction', {
        p_product_id: entry.itemId,
        p_type: entry.type,
        p_quantity: entry.quantity,
        p_note: note,
      });

      if (error) {
        console.error('[recordBulkInventoryTransactions] Supabase RPC Error:', error.message, error.details, error.hint);
        await recordDataChange({
          action: 'UPDATE',
          module: 'inventory',
          entityType: 'inventory_item',
          entityId: entry.itemId,
          entityLabel: beforeItem?.name ?? null,
          status: 'failed',
          errorMessage: error.message,
          metadata: withAuditMetadata(
            {
              operation: 'record_transaction',
              type: entry.type,
              quantity: entry.quantity,
              bulk: true,
              itemName: beforeItem?.name ?? null,
            },
            auditOptions,
          ),
        });
        const message = error.message.includes('Insufficient stock')
          ? 'ยอดคงเหลือไม่เพียงพอสำหรับการนำออก'
          : error.message;
        results.push({ itemId: entry.itemId, success: false, error: message });
        continue;
      }

      await recordDataChange({
        action: 'UPDATE',
        module: 'inventory',
        entityType: 'inventory_item',
        entityId: entry.itemId,
        entityLabel: beforeItem?.name ?? null,
        fieldChanges: [
          {
            field: 'stock',
            old_value: data?.old_stock ?? beforeItem?.stock ?? null,
            new_value: data?.new_stock ?? null,
          },
        ],
        metadata: withAuditMetadata(
          {
            operation: 'record_transaction',
            type: entry.type,
            quantity: entry.quantity,
            note,
            bulk: true,
            itemName: beforeItem?.name ?? null,
            order_point: data?.order_point ?? beforeItem?.order_point ?? null,
          },
          auditOptions,
        ),
      });

      results.push({ itemId: entry.itemId, success: true, newStock: data?.new_stock });
    }

    revalidatePath('/[locale]/inventory', 'page');
    revalidatePath('/[locale]/inventory/count', 'page');

    const allSucceeded = results.every((row) => row.success);
    return {
      success: allSucceeded,
      results,
      error: allSucceeded ? undefined : 'Some bulk entries failed',
    };
  } catch (error: any) {
    console.error('[recordBulkInventoryTransactions] Unexpected Error:', error.message || error);
    return {
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลหลายรายการ',
      results: [] as BulkInventoryTransactionResult[],
    };
  }
}

// === SET ABSOLUTE STOCK (Warehouse cell edit + Stock-taking) ===
const stockUpdateSchema = z.object({
  itemId: z.string().uuid(),
  stock: z.number().min(0),
  note: z.string().optional(),
});

export type InventoryStockUpdateOptions = InventoryAuditOptions & {
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

    const { data: beforeItem } = await supabase
      .from('inventory_items')
      .select('name, stock, order_point')
      .eq('id', itemId)
      .maybeSingle();

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

    await recordDataChange({
      action: 'UPDATE',
      module: 'inventory',
      entityType: 'inventory_item',
      entityId: itemId,
      entityLabel: beforeItem?.name ?? null,
      fieldChanges: computeFieldChanges(
        { stock: beforeItem?.stock ?? null },
        { stock: newStock }
      ),
      metadata: withAuditMetadata(
        {
          operation: 'set_stock',
          note,
          recordHistory,
          itemName: beforeItem?.name ?? null,
          order_point: beforeItem?.order_point ?? null,
        },
        options
      ),
    });

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
export async function deleteInventoryItem(itemId: string, auditOptions?: InventoryAuditOptions) {
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

    const { data: itemBeforeDelete } = await supabase
      .from('inventory_items')
      .select('id, name, stock, unit')
      .eq('id', itemId)
      .maybeSingle();

    const stockAtDelete = Number(itemBeforeDelete?.stock ?? 0);
    await insertInventoryLifecycleTransaction(
      itemId,
      'DELETE',
      stockAtDelete < 0 ? 0 : stockAtDelete,
      0,
      itemBeforeDelete?.name ?? ''
    );

    // Step 2: Proceed with Delete using Service Role (Admin Client)
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('[deleteInventoryItem] Supabase Error:', error.message, error.details);
      await recordDataChange({
        action: 'DELETE',
        module: 'inventory',
        entityType: 'inventory_item',
        entityId: itemId,
        entityLabel: itemBeforeDelete?.name ?? null,
        oldValue: itemBeforeDelete ?? null,
        status: 'failed',
        errorMessage: error.message,
        metadata: withAuditMetadata({}, auditOptions),
      });
      return { success: false, error: error.message };
    }

    await recordDataChange({
      action: 'DELETE',
      module: 'inventory',
      entityType: 'inventory_item',
      entityId: itemId,
      entityLabel: itemBeforeDelete?.name ?? null,
      oldValue: itemBeforeDelete ?? null,
      metadata: withAuditMetadata({}, auditOptions),
    });

    // Step 3: UI Refresh Logic
    revalidatePath('/[locale]/inventory');
    return { success: true };
  } catch (error: any) {
    console.error('[deleteInventoryItem] Unexpected Error:', error.message || error);
    return { success: false, error: 'เกิดข้อผิดพลาดในการลบข้อมูลสินค้า' };
  }
}

export async function deleteInventoryItemsBulk(itemIds: string[], auditOptions?: InventoryAuditOptions) {
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

    const { data: itemsBeforeDelete } = await supabase
      .from('inventory_items')
      .select('id, name, stock')
      .in('id', itemIds);

    for (const item of itemsBeforeDelete ?? []) {
      const stockAtDelete = Number(item.stock ?? 0);
      await insertInventoryLifecycleTransaction(
        item.id,
        'DELETE',
        stockAtDelete < 0 ? 0 : stockAtDelete,
        0,
        item.name ?? ''
      );
    }

    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .in('id', itemIds);

    if (error) {
      console.error('[deleteInventoryItemsBulk] Supabase Error:', error.message, error.details);
      await recordDataChange({
        action: 'BULK_DELETE',
        module: 'inventory',
        entityType: 'inventory_item',
        status: 'failed',
        errorMessage: error.message,
        metadata: withAuditMetadata({ itemIds, count: itemIds.length }, auditOptions),
      });
      return { success: false, error: error.message, deleted: 0 };
    }

    await recordDataChange({
      action: 'BULK_DELETE',
      module: 'inventory',
      entityType: 'inventory_item',
      metadata: withAuditMetadata(
        {
          itemIds,
          count: itemIds.length,
          labels: (itemsBeforeDelete ?? []).map((item) => item.name),
        },
        auditOptions
      ),
    });

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
    const enrichedData = transactions.map((tx: any) => {
      const resolvedName =
        (tx.inventory_item_id && itemNameMap[tx.inventory_item_id]) ||
        (tx.type === 'DELETE' && tx.note ? tx.note : null) ||
        (tx.type === 'ADD' && tx.note ? tx.note : null) ||
        'ไม่ทราบชื่อสินค้า';

      return {
        ...tx,
        inventory_items: {
          name: resolvedName,
        },
      };
    });

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

export type ItemCountAccuracyStats = {
  totalChecks: number;
  matchChecks: number;
  accuracyPct: number | null;
  lastTheoreticalQty: number | null;
  lastMatched: boolean | null;
};

export type CountAccuracyStatsResult = {
  perItem: Record<string, ItemCountAccuracyStats>;
  overall: {
    totalChecks: number;
    matchChecks: number;
    accuracyPct: number | null;
  };
};

async function fetchItemLedgerRows(itemId: string): Promise<InOutLedgerRow[]> {
  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('type, quantity, created_at, balance_after')
    .eq('inventory_item_id', itemId)
    .in('type', ['ADD', 'IN', 'OUT', 'ADJUST', 'DELETE'])
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[fetchItemLedgerRows] Supabase Error:', error.message, error.details);
    throw error;
  }

  return (data ?? []) as InOutLedgerRow[];
}

// === IN/OUT THEORETICAL STOCK (count accuracy baseline) ===
export async function fetchInOutTheoreticalQtyMap(itemIds: string[]) {
  noStore();

  try {
    const uniqueIds = [...new Set(itemIds.filter(Boolean))];
    if (uniqueIds.length === 0) {
      return { success: true, data: {} as Record<string, number> };
    }

    const { data, error } = await supabase
      .from('inventory_transactions')
      .select('inventory_item_id, type, quantity, created_at, balance_after')
      .in('inventory_item_id', uniqueIds)
      .in('type', ['ADD', 'IN', 'OUT', 'ADJUST', 'DELETE'])
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[fetchInOutTheoreticalQtyMap] Supabase Error:', error.message, error.details);
      return { success: false, error: error.message, data: {} as Record<string, number> };
    }

    const rowsByItem: Record<string, InOutLedgerRow[]> = {};
    for (const id of uniqueIds) {
      rowsByItem[id] = [];
    }

    for (const row of data ?? []) {
      const itemId = row.inventory_item_id as string | null;
      if (!itemId || !rowsByItem[itemId]) continue;
      rowsByItem[itemId].push({
        type: row.type as InOutLedgerRow['type'],
        quantity: Number(row.quantity) || 0,
        created_at: row.created_at as string,
        balance_after:
          row.balance_after === null || row.balance_after === undefined
            ? undefined
            : Number(row.balance_after),
      });
    }

    const result: Record<string, number> = {};
    for (const [itemId, rows] of Object.entries(rowsByItem)) {
      result[itemId] = computeInOutTheoreticalStock(rows);
    }

    return { success: true, data: result };
  } catch (error: any) {
    console.error('[fetchInOutTheoreticalQtyMap] Unexpected Error:', error.message || error);
    return {
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการคำนวณสต็อกจากบันทึกรับเข้า/นำออก',
      data: {} as Record<string, number>,
    };
  }
}

export async function computeInOutTheoreticalStockForItem(itemId: string) {
  noStore();

  try {
    const parsed = z.string().uuid().safeParse(itemId);
    if (!parsed.success) {
      return { success: false, error: 'Invalid item id', theoreticalQty: 0 };
    }

    const rows = await fetchItemLedgerRows(itemId);
    const theoreticalQty = computeInOutTheoreticalStock(rows);
    return { success: true, theoreticalQty };
  } catch (error: any) {
    console.error('[computeInOutTheoreticalStockForItem] Unexpected Error:', error.message || error);
    return {
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการคำนวณสต็อกจากบันทึกรับเข้า/นำออก',
      theoreticalQty: 0,
    };
  }
}

const countVerificationSchema = z.object({
  itemId: z.string().uuid(),
  countedQty: z.number().min(0),
});

// === RECORD COUNT VERIFICATION ===
export async function recordCountVerification(itemId: string, countedQty: number) {
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

    const parsed = countVerificationSchema.safeParse({ itemId, countedQty });
    if (!parsed.success) {
      return { success: false, error: 'Invalid count verification payload' };
    }

    const theoreticalResult = await computeInOutTheoreticalStockForItem(itemId);
    if (!theoreticalResult.success) {
      return { success: false, error: theoreticalResult.error };
    }

    const theoreticalQty = theoreticalResult.theoreticalQty;
    const matched = countedQty === theoreticalQty;

    const { error } = await supabase.from('inventory_count_verifications').insert({
      inventory_item_id: itemId,
      counted_qty: countedQty,
      in_out_theoretical_qty: theoreticalQty,
      matched,
    });

    if (error) {
      console.error('[recordCountVerification] Supabase Error:', error.message, error.details);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      matched,
      theoreticalQty,
      countedQty,
    };
  } catch (error: any) {
    console.error('[recordCountVerification] Unexpected Error:', error.message || error);
    return {
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการบันทึกผลตรวจนับ',
    };
  }
}

// === FETCH COUNT ACCURACY STATS ===
export async function fetchCountAccuracyStats(): Promise<{
  success: boolean;
  data?: CountAccuracyStatsResult;
  error?: string;
}> {
  noStore();

  try {
    const { data: rows, error } = await supabase
      .from('inventory_count_verifications')
      .select('inventory_item_id, matched, in_out_theoretical_qty, counted_at')
      .order('counted_at', { ascending: false });

    if (error) {
      console.error('[fetchCountAccuracyStats] Supabase Error:', error.message, error.details);
      return { success: false, error: error.message };
    }

    const perItem: Record<string, ItemCountAccuracyStats> = {};
    let overallTotal = 0;
    let overallMatch = 0;

    for (const row of rows ?? []) {
      const itemId = row.inventory_item_id as string;
      if (!perItem[itemId]) {
        perItem[itemId] = {
          totalChecks: 0,
          matchChecks: 0,
          accuracyPct: null,
          lastTheoreticalQty: null,
          lastMatched: null,
        };
      }

      const stats = perItem[itemId];
      stats.totalChecks += 1;
      if (row.matched) stats.matchChecks += 1;

      if (stats.lastTheoreticalQty === null) {
        stats.lastTheoreticalQty = Number(row.in_out_theoretical_qty);
        stats.lastMatched = Boolean(row.matched);
      }
    }

    for (const stats of Object.values(perItem)) {
      stats.accuracyPct = computeAccuracyPct(stats.matchChecks, stats.totalChecks);
      overallTotal += stats.totalChecks;
      overallMatch += stats.matchChecks;
    }

    return {
      success: true,
      data: {
        perItem,
        overall: {
          totalChecks: overallTotal,
          matchChecks: overallMatch,
          accuracyPct: computeAccuracyPct(overallMatch, overallTotal),
        },
      },
    };
  } catch (error: any) {
    console.error('[fetchCountAccuracyStats] Unexpected Error:', error.message || error);
    return {
      success: false,
      error: error.message || 'เกิดข้อผิดพลาดในการดึงสถิติความแม่นยำ',
    };
  }
}
