'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import { z } from 'zod';
import { assertWritableSession } from '@/app/actions/auth';
import { recordDataChange } from '@/app/actions/data-change-log-actions';
import { computeFieldChanges } from '@/lib/data-change-log';
import {
  computeAggregateCountAccuracyPct,
  computeCountDiscrepancy,
  isCountMatch,
} from '@/lib/inventory-count-accuracy';
import {
  computeInventoryTargetRecommendation,
  type InventoryRecommendationTransaction,
  type InventoryShortageRisk,
} from '@/lib/inventory-recommended-target-stock';
import { ensureServerSession } from '@/lib/security/server-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// ใช้ SERVICE_ROLE_KEY เพื่อให้ Server Action มีสิทธิ์สูงสุดในการอ่าน/เขียน ทะลุ RLS
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseAdminKey);

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type InventoryAuditOptions = {
  clientSessionId?: string;
  /** When true, in-app inventory notifications are skipped (e.g. stock-taking count page). */
  suppressNotification?: boolean;
  notificationContext?: 'inventory_count' | 'inventory';
  /** Required for desktop/mobile stock notifications — only quick-action UI origins. */
  notificationSource?: 'inventory_quick_action_bar' | 'inventory_quick_action_fab' | 'inventory_warehouse_grid';
};

type InventoryLifecycleType = 'ADD' | 'DELETE';

/** SEC-AUTH-001 — Service Role reads require PIN or verified Supabase session. */
async function requireAuthenticatedRead(): Promise<string | null> {
  const auth = await ensureServerSession();
  return auth.ok ? null : auth.error;
}

/** SEC-AUTH-001 — Mutations require valid session (incl. revocation) and writable PIN. */
async function requireAuthenticatedMutation(): Promise<string | null> {
  const auth = await ensureServerSession();
  if (!auth.ok) return auth.error;
  const writable = await assertWritableSession();
  if (!writable.ok) return writable.error;
  return null;
}

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
    const authError = await requireAuthenticatedMutation();
    if (authError) return { success: false, error: authError };

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
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error('[recordItemAddHistory] Unexpected Error:', message);
    return { success: false, error: message || 'เกิดข้อผิดพลาดในการบันทึกประวัติเพิ่มรายการ' };
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
  if (options.notificationSource) {
    result.notificationSource = options.notificationSource;
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
    const authError = await requireAuthenticatedMutation();
    if (authError) return { success: false, error: authError };

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
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error('[recordTransaction] Unexpected Error:', message);
    return { success: false, error: message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' };
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
    const authError = await requireAuthenticatedMutation();
    if (authError) {
      return { success: false, error: authError, results: [] as BulkInventoryTransactionResult[] };
    }

    const parsed = bulkTransactionsSchema.safeParse({ entries, note });
    if (!parsed.success) {
      return { success: false, error: 'Invalid bulk transaction payload', results: [] as BulkInventoryTransactionResult[] };
    }

    const results: BulkInventoryTransactionResult[] = await Promise.all(
      parsed.data.entries.map(async (entry) => {
        try {
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
            return { itemId: entry.itemId, success: false, error: message };
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

          return { itemId: entry.itemId, success: true, newStock: data?.new_stock };
        } catch (err: unknown) {
          console.error(`[recordBulkInventoryTransactions] Error on itemId ${entry.itemId}:`, err);
          return { itemId: entry.itemId, success: false, error: getErrorMessage(err) || 'Error processing item' };
        }
      })
    );

    revalidatePath('/[locale]/inventory', 'page');
    revalidatePath('/[locale]/inventory/count', 'page');

    const allSucceeded = results.every((row) => row.success);
    return {
      success: allSucceeded,
      results,
      error: allSucceeded ? undefined : 'Some bulk entries failed',
    };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error('[recordBulkInventoryTransactions] Unexpected Error:', message);
    return {
      success: false,
      error: message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลหลายรายการ',
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
    const authError = await requireAuthenticatedMutation();
    if (authError) return { success: false, error: authError };

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
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error('[updateInventoryStock] Unexpected Error:', message);
    return { success: false, error: message || 'เกิดข้อผิดพลาดในการบันทึกจำนวนคงเหลือ' };
  }
}

const inventoryFieldUpdateSchema = z.object({
  itemId: z.string().uuid(),
  field: z.enum(['name', 'order_qty', 'order_point', 'target_stock', 'unit', 'source', 'count_policy', 'shortage_risk', 'lead_time_days']),
  value: z.union([z.string(), z.number()]),
});

function sanitizeInventoryFieldValue(field: z.infer<typeof inventoryFieldUpdateSchema>['field'], value: string | number) {
  if (['order_qty', 'order_point', 'target_stock', 'lead_time_days'].includes(field)) {
    const num = value === '' || value === null || value === undefined ? 0 : Number(value);
    if (Number.isNaN(num)) return 0;
    return field === 'lead_time_days' ? Math.max(0, Math.min(30, Math.round(num))) : num;
  }

  if (field === 'count_policy') {
    return value === 'sufficiency_check' ? 'sufficiency_check' : 'exact_count';
  }

  if (field === 'shortage_risk') {
    return value === 'high' || value === 'medium' ? value : 'normal';
  }

  return String(value ?? '');
}

export async function updateInventoryItemField(
  itemId: string,
  field: string,
  value: string | number,
  auditOptions?: InventoryAuditOptions,
) {
  try {
    const authError = await requireAuthenticatedMutation();
    if (authError) return { success: false, error: authError };

    const parsed = inventoryFieldUpdateSchema.safeParse({ itemId, field, value });
    if (!parsed.success) {
      return { success: false, error: 'Invalid inventory field update payload' };
    }

    const sanitizedValue = sanitizeInventoryFieldValue(parsed.data.field, parsed.data.value);
    const { data: beforeItem, error: beforeError } = await supabase
      .from('inventory_items')
      .select('name, order_qty, order_point, target_stock, unit, source, count_policy, shortage_risk, lead_time_days')
      .eq('id', itemId)
      .maybeSingle();

    if (beforeError) {
      console.error('[updateInventoryItemField] Supabase Error:', beforeError.message, beforeError.details);
      return { success: false, error: beforeError.message };
    }

    const { error } = await supabase
      .from('inventory_items')
      .update({ [parsed.data.field]: sanitizedValue, updated_at: new Date().toISOString() })
      .eq('id', itemId);

    if (error) {
      console.error('[updateInventoryItemField] Supabase Error:', error.message, error.details);
      return { success: false, error: error.message };
    }

    await recordDataChange({
      action: 'UPDATE',
      module: 'inventory',
      entityType: 'inventory_item',
      entityId: itemId,
      entityLabel: beforeItem?.name ?? null,
      fieldChanges: computeFieldChanges(
        { [parsed.data.field]: beforeItem?.[parsed.data.field] ?? null },
        { [parsed.data.field]: sanitizedValue },
      ),
      metadata: withAuditMetadata(
        {
          operation: 'update_inventory_field',
          field: parsed.data.field,
          itemName: beforeItem?.name ?? null,
        },
        auditOptions,
      ),
    });

    revalidatePath('/[locale]/inventory', 'page');
    revalidatePath('/[locale]/inventory/count', 'page');
    return { success: true, value: sanitizedValue };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error('[updateInventoryItemField] Unexpected Error:', message);
    return { success: false, error: message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลสินค้า' };
  }
}

type InventoryRecommendationItemRow = {
  id: string;
  target_stock: number | null;
  shortage_risk: string | null;
  lead_time_days: number | null;
};

type InventoryRecommendationTxRow = InventoryRecommendationTransaction & {
  inventory_item_id: string | null;
};

type InventoryHolidayRow = {
  date: string;
  name: string | null;
};

export async function fetchInventoryTargetRecommendations(itemIds?: string[]) {
  noStore();
  const authError = await requireAuthenticatedRead();
  if (authError) {
    return { success: false, error: authError, recommendationsByItemId: {} };
  }

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const lookbackDate = new Date(today);
  lookbackDate.setUTCDate(lookbackDate.getUTCDate() - 60);
  const lookbackIso = lookbackDate.toISOString();
  const windowEnd = new Date(today);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 13);
  const windowEndStr = windowEnd.toISOString().slice(0, 10);
  const safeItemIds = (itemIds ?? []).filter(Boolean);

  try {
    let itemsQuery = supabase
      .from('inventory_items')
      .select('id, target_stock, shortage_risk, lead_time_days')
      .order('sort_order', { ascending: true });
    let txQuery = supabase
      .from('inventory_transactions')
      .select('inventory_item_id, type, quantity, created_at')
      .eq('type', 'OUT')
      .gte('created_at', lookbackIso);

    if (safeItemIds.length > 0) {
      itemsQuery = itemsQuery.in('id', safeItemIds);
      txQuery = txQuery.in('inventory_item_id', safeItemIds);
    }

    const [itemsRes, txRes, holidaysRes] = await Promise.all([
      itemsQuery,
      txQuery,
      supabase
        .from('holidays')
        .select('date, name')
        .gte('date', todayStr)
        .lte('date', windowEndStr),
    ]);

    if (itemsRes.error) {
      console.error('[fetchInventoryTargetRecommendations] Supabase Error:', itemsRes.error.message, itemsRes.error.details);
      return { success: false, error: itemsRes.error.message, recommendationsByItemId: {} };
    }
    if (txRes.error) {
      console.error('[fetchInventoryTargetRecommendations] Supabase Error:', txRes.error.message, txRes.error.details);
      return { success: false, error: txRes.error.message, recommendationsByItemId: {} };
    }
    if (holidaysRes.error) {
      console.error('[fetchInventoryTargetRecommendations] Supabase Error:', holidaysRes.error.message, holidaysRes.error.details);
      return { success: false, error: holidaysRes.error.message, recommendationsByItemId: {} };
    }

    const transactionsByItemId = new Map<string, InventoryRecommendationTxRow[]>();
    for (const row of (txRes.data ?? []) as InventoryRecommendationTxRow[]) {
      if (!row.inventory_item_id) continue;
      const rows = transactionsByItemId.get(row.inventory_item_id) ?? [];
      rows.push(row);
      transactionsByItemId.set(row.inventory_item_id, rows);
    }

    const holidays = ((holidaysRes.data ?? []) as InventoryHolidayRow[]).map((holiday) => ({
      date: holiday.date,
      name: holiday.name,
    }));
    const recommendationsByItemId: Record<string, {
      recommended_target_stock: number;
      recommendation_confidence: string;
      recommendation_explanation: string[];
      recommendation_display_value: string;
      abnormal_out_count: number;
      average_daily_usage: number;
    }> = {};

    for (const item of (itemsRes.data ?? []) as InventoryRecommendationItemRow[]) {
      const shortageRisk: InventoryShortageRisk =
        item.shortage_risk === 'medium' || item.shortage_risk === 'high'
          ? item.shortage_risk
          : 'normal';
      const recommendation = computeInventoryTargetRecommendation({
        currentTargetStock: Number(item.target_stock ?? 0),
        shortageRisk,
        leadTimeDays: Number(item.lead_time_days ?? 3),
        today: todayStr,
        transactions: transactionsByItemId.get(item.id) ?? [],
        holidays,
      });

      recommendationsByItemId[item.id] = {
        recommended_target_stock: recommendation.recommendedTargetStock,
        recommendation_confidence: recommendation.confidence,
        recommendation_explanation: recommendation.explanationLines,
        recommendation_display_value: recommendation.displayValue,
        abnormal_out_count: recommendation.abnormalOutCount,
        average_daily_usage: recommendation.averageDailyUsage,
      };
    }

    return { success: true, recommendationsByItemId };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error('[fetchInventoryTargetRecommendations] Unexpected Error:', message);
    return {
      success: false,
      error: message || 'เกิดข้อผิดพลาดในการคำนวณจำนวนที่แนะนำ',
      recommendationsByItemId: {},
    };
  }
}

const inventoryReorderSchema = z.array(
  z.object({
    id: z.string().uuid(),
    sort_order: z.number().int().positive(),
  }),
).min(1);

export async function reorderInventoryItems(
  sortOrders: Array<{ id: string; sort_order: number }>,
  auditOptions?: InventoryAuditOptions,
) {
  try {
    const authError = await requireAuthenticatedMutation();
    if (authError) return { success: false, error: authError };

    const parsed = inventoryReorderSchema.safeParse(sortOrders);
    if (!parsed.success) {
      return { success: false, error: 'Invalid inventory reorder payload' };
    }

    const { error } = await supabase
      .from('inventory_items')
      .upsert(parsed.data);

    if (error) {
      console.error('[reorderInventoryItems] Supabase Error:', error.message, error.details);
      return { success: false, error: error.message };
    }

    await recordDataChange({
      action: 'BULK_UPDATE',
      module: 'inventory',
      entityType: 'inventory_item',
      metadata: withAuditMetadata(
        {
          operation: 'reorder_inventory_items',
          itemIds: parsed.data.map((item) => item.id),
        },
        auditOptions,
      ),
    });

    revalidatePath('/[locale]/inventory', 'page');
    revalidatePath('/[locale]/inventory/count', 'page');
    return { success: true };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error('[reorderInventoryItems] Unexpected Error:', message);
    return { success: false, error: message || 'เกิดข้อผิดพลาดในการจัดลำดับสินค้า' };
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
    /**
     * SECURITY LAYER: Treat AI/Client Code as Untrusted.
     * Verify current session and user ownership before executing delete.
     * This prevents Broken Object Level Authorization (BOLA).
     */
    const authError = await requireAuthenticatedMutation();
    if (authError) return { success: false, error: authError };

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
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error('[deleteInventoryItem] Unexpected Error:', message);
    return { success: false, error: 'เกิดข้อผิดพลาดในการลบข้อมูลสินค้า' };
  }
}

export async function deleteInventoryItemsBulk(itemIds: string[], auditOptions?: InventoryAuditOptions) {
  if (itemIds.length === 0) return { success: true, deleted: 0 };

  try {
    const authError = await requireAuthenticatedMutation();
    if (authError) return { success: false, error: authError, deleted: 0 };

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
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error('[deleteInventoryItemsBulk] Unexpected Error:', message);
    return { success: false, error: 'เกิดข้อผิดพลาดในการลบข้อมูลสินค้า', deleted: 0 };
  }
}

export type InventoryTransactionType = 'IN' | 'OUT' | 'ADJUST' | 'ADD' | 'DELETE';
export type InventoryTransactionFilterType = 'ALL' | Extract<InventoryTransactionType, 'IN' | 'OUT' | 'ADJUST'>;

type FetchTransactionHistoryOptions = {
  itemId?: string;
  limit?: number;
  offset: number;
  type?: InventoryTransactionFilterType;
};

type RawInventoryTransaction = {
  id: string;
  inventory_item_id: string | null;
  type: InventoryTransactionType;
  quantity: number;
  note: string | null;
  created_at: string;
  balance_after: number;
};

type InventoryItemNameRow = {
  id: string;
  name: string;
};

function sanitizeHistoryLimit(limit: number | undefined) {
  const parsed = Math.floor(Number(limit ?? 50));
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(Math.max(parsed, 1), 100);
}

function sanitizeHistoryOffset(offset: number | undefined) {
  const parsed = Math.floor(Number(offset ?? 0));
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(parsed, 0);
}

// === FETCH TRANSACTION HISTORY (SPEC 3.1 — Two-Step Fetch) ===
// Column: inventory_item_id (VERIFIED via Supabase Dashboard — DO NOT CHANGE)
// Strategy: Two-step fetch (transactions -> item names -> merge in code)
export async function fetchTransactionHistory(
  optionsOrItemId?: FetchTransactionHistoryOptions | string,
  legacyLimit: number = 50,
) {
  noStore(); // Phase 1: Force disable cache — always fetch fresh from DB

  const authError = await requireAuthenticatedRead();
  if (authError) {
    return { success: false, error: authError, data: [], hasMore: false };
  }

  try {
    const options =
      typeof optionsOrItemId === 'object'
        ? optionsOrItemId
        : { itemId: optionsOrItemId, limit: legacyLimit, offset: 0 };
    const itemId = options?.itemId;
    const safeLimit = sanitizeHistoryLimit(options?.limit);
    const offset = sanitizeHistoryOffset(options?.offset);
    const type = options?.type && options.type !== 'ALL' ? options.type : undefined;

    // Step 1: Fetch raw transaction data (no join — bulletproof approach)
    // Uses inventory_item_id — VERIFIED column name in actual DB
    let query = supabase
      .from('inventory_transactions')
      .select('id, inventory_item_id, type, quantity, note, created_at, balance_after')
      .order('created_at', { ascending: false });

    if (itemId) {
      query = query.eq('inventory_item_id', itemId);
    }

    if (type) {
      query = query.eq('type', type);
    }

    query = query.range(offset, offset + safeLimit);

    const { data: transactionRows, error: txError } = await query;

    if (txError) {
      console.error('[fetchTransactionHistory] Supabase Deep Error:', txError);
      console.error('[fetchTransactionHistory] Details:', txError.message, txError.details, txError.hint);
      return { success: false, error: `DB Error: ${txError.message}`, data: [], hasMore: false };
    }

    const transactions = (transactionRows ?? []) as RawInventoryTransaction[];

    if (transactions.length === 0) {
      return { success: true, data: [], hasMore: false };
    }

    const hasMore = transactions.length > safeLimit;
    const visibleTransactions = transactions.slice(0, safeLimit);

    // Step 2: Get unique item IDs and fetch their names separately
    // Uses inventory_item_id — VERIFIED column name in actual DB
    const itemIds = [...new Set(
      visibleTransactions.map((tx) => tx.inventory_item_id).filter(Boolean)
    )] as string[];

    const itemNameMap: Record<string, string> = {};

    if (itemIds.length > 0) {
      const { data: itemsData, error: itemsError } = await supabase
        .from('inventory_items')
        .select('id, name')
        .in('id', itemIds);

      if (itemsError) {
        console.error('[fetchTransactionHistory] Items Lookup Error:', itemsError);
      } else if (itemsData) {
        (itemsData as InventoryItemNameRow[]).forEach((item) => {
          itemNameMap[item.id] = item.name;
        });
      }
    }

    // Step 3: Merge names into transaction data
    // Uses inventory_item_id — VERIFIED column name in actual DB
    const enrichedData = visibleTransactions.map((tx) => {
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

    return { success: true, data: enrichedData, hasMore };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[fetchTransactionHistory] Unexpected Error:', message);
    return { success: false, error: message || 'เกิดข้อผิดพลาดในการดึงประวัติ', data: [], hasMore: false };
  }
}

// === FETCH FREQUENT ITEMS ===
// Uses inventory_item_id — VERIFIED column name in actual DB
export async function fetchFrequentItems() {
  const authError = await requireAuthenticatedRead();
  if (authError) {
    return { success: false, error: authError, data: [] };
  }

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
    type FrequentTxRow = { inventory_item_id: string | null };
    const counts: Record<string, number> = {};
    (data as FrequentTxRow[]).forEach((tx) => {
      const id = tx.inventory_item_id;
      if (id) counts[id] = (counts[id] || 0) + 1;
    });

    // Get top 10 IDs
    const topIds = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
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
        const item = (itemsData as InventoryItemNameRow[]).find((i) => i.id === id);
        return item ? { id: item.id as string, name: item.name as string } : null;
      })
      .filter((x): x is { id: string; name: string } => x !== null);

    return { success: true, data: result };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error('[fetchFrequentItems] Unexpected Error:', message);
    return { success: false, error: message };
  }
}

// === FETCH COMPREHENSIVE INVENTORY DATA ===
export async function fetchComprehensiveInventoryData() {
  noStore();

  const authError = await requireAuthenticatedRead();
  if (authError) {
    return { success: false, error: authError, data: null };
  }

  try {
    const [itemsResult, txResult] = await Promise.all([
      supabase
        .from('inventory_items')
        .select('id, name, stock, order_point, target_stock, order_qty, unit, source, sort_order, updated_at')
        .order('name'),
      supabase
        .from('inventory_transactions')
        .select('id, inventory_item_id, type, quantity, note, created_at')
        .order('created_at', { ascending: false })
        .limit(200),
    ]);

    const { data: inventoryItems, error: itemsError } = itemsResult;
    const { data: inventoryTransactions, error: txError } = txResult;

    if (itemsError) {
      console.error('[fetchComprehensiveInventoryData] Items Error:', itemsError);
      return {
        success: false, error: itemsError.message, data: null };
    }

    if (txError) {
      console.error('[fetchComprehensiveInventoryData] Transactions Error:', txError);
      return { success: false, error: txError.message, data: null };
    }

    type InventorySummaryRow = {
      id: string;
      name: string | null;
      stock: number | null;
      order_point: number | null;
      target_stock: number | null;
      order_qty: number | null;
      unit: string | null;
      source: string | null;
      updated_at: string | null;
    };

    type ValidatedInventoryItem = {
      id: string;
      name: string;
      stock: number;
      orderQty: number;
      orderPoint: number;
      targetStock: number;
      unit: string | null;
      source: string | null;
      isLowStock: boolean;
      updatedAt: string | null;
      createdAt: string | null;
    };

    // Validate and process inventory items
    const validatedItems: ValidatedInventoryItem[] = [];
    const validationReport = {
      totalItems: inventoryItems?.length || 0,
      validItems: 0,
      invalidItems: 0,
      itemsWithLowStock: 0,
      validationErrors: [] as string[]
    };

    (inventoryItems as InventorySummaryRow[] | null)?.forEach((item) => {
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
          createdAt: null,
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

  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error('[fetchComprehensiveInventoryData] Unexpected Error:', error);
    return { success: false, error: message, data: null };
  }
}

export type ItemCountAccuracyStats = {
  itemName?: string;
  totalChecks: number;
  matchChecks: number;
  accuracyPct: number | null;
  totalDiscrepancyQty: number;
  totalComparedQty: number;
  lastSystemStockQty: number | null;
  lastCountedQty: number | null;
  lastCountedAt: string | null;
  lastMatched: boolean | null;
};

export type CountAccuracyStatsResult = {
  perItem: Record<string, ItemCountAccuracyStats>;
  overall: {
    totalChecks: number;
    matchChecks: number;
    accuracyPct: number | null;
    totalDiscrepancyQty: number;
    totalComparedQty: number;
  };
};

export type InventoryAccuracyReportResult = CountAccuracyStatsResult & {
  highDiscrepancyItems: Array<ItemCountAccuracyStats & { itemId: string }>;
};

const countVerificationSchema = z.object({
  itemId: z.string().uuid(),
  countedQty: z.number().min(0),
  systemStockQty: z.number().min(0),
});

// === RECORD COUNT VERIFICATION ===
/** Records accuracy only from the stock-taking count page — not manual warehouse overrides. */
export async function recordCountVerification(itemId: string, countedQty: number) {
  try {
    const authError = await requireAuthenticatedMutation();
    if (authError) return { success: false, error: authError };

    const { data: itemRow, error: itemError } = await supabase
      .from('inventory_items')
      .select('stock, count_policy')
      .eq('id', itemId)
      .maybeSingle();

    if (itemError) {
      console.error('[recordCountVerification] Supabase Error:', itemError.message, itemError.details);
      return { success: false, error: itemError.message };
    }

    const baselineStock = Number(itemRow?.stock ?? 0);
    const countPolicy = itemRow?.count_policy ?? 'exact_count';

    const parsed = countVerificationSchema.safeParse({
      itemId,
      countedQty,
      systemStockQty: baselineStock,
    });
    if (!parsed.success) {
      return { success: false, error: 'Invalid count verification payload' };
    }

    if (countPolicy !== 'exact_count') {
      return {
        success: true,
        skipped: true,
        matched: false,
        systemStockQty: baselineStock,
        countedQty,
      };
    }

    const matched = isCountMatch(countedQty, baselineStock);

    const { error } = await supabase.from('inventory_count_verifications').insert({
      inventory_item_id: itemId,
      counted_qty: countedQty,
      system_stock_qty: baselineStock,
      matched,
    });

    if (error) {
      console.error('[recordCountVerification] Supabase Error:', error.message, error.details);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      matched,
      systemStockQty: baselineStock,
      countedQty,
    };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error('[recordCountVerification] Unexpected Error:', message);
    return {
      success: false,
      error: message || 'เกิดข้อผิดพลาดในการบันทึกผลตรวจนับ',
    };
  }
}

export type InventoryCountSaveResult = {
  success: boolean;
  error?: string;
  skipped?: boolean;
  matched?: boolean;
  systemStockQty?: number;
  countedQty?: number;
  newStock?: number;
};

export type InventoryCountSaveOptions = InventoryAuditOptions & {
  isUndo?: boolean;
};

/** Count-page save: capture the pre-count baseline before updating stock. */
export async function recordInventoryCountAndUpdateStock(
  itemId: string,
  countedQty: number,
  options?: InventoryCountSaveOptions,
): Promise<InventoryCountSaveResult> {
  try {
    const authError = await requireAuthenticatedMutation();
    if (authError) return { success: false, error: authError };

    const { data: itemRow, error: itemError } = await supabase
      .from('inventory_items')
      .select('name, stock, order_point, count_policy')
      .eq('id', itemId)
      .maybeSingle();

    if (itemError) {
      console.error('[recordInventoryCountAndUpdateStock] Supabase Error:', itemError.message, itemError.details);
      return { success: false, error: itemError.message };
    }

    const baselineStock = Number(itemRow?.stock ?? 0);
    const countPolicy = itemRow?.count_policy ?? 'exact_count';
    const parsed = countVerificationSchema.safeParse({
      itemId,
      countedQty,
      systemStockQty: baselineStock,
    });

    if (!parsed.success) {
      return { success: false, error: 'Invalid count verification payload' };
    }

    const matched = countPolicy === 'exact_count'
      ? isCountMatch(countedQty, baselineStock)
      : false;

    if (countPolicy === 'exact_count') {
      if (options?.isUndo) {
        // Find the latest verification ID to delete
        const { data: latestVerifs, error: lookupError } = await supabase
          .from('inventory_count_verifications')
          .select('id')
          .eq('inventory_item_id', itemId)
          .order('counted_at', { ascending: false })
          .limit(1);

        if (lookupError) {
          console.error('[recordInventoryCountAndUpdateStock] Undo Lookup Error:', lookupError.message);
        } else if (latestVerifs && latestVerifs.length > 0) {
          const { error: deleteError } = await supabase
            .from('inventory_count_verifications')
            .delete()
            .eq('id', latestVerifs[0].id);

          if (deleteError) {
            console.error('[recordInventoryCountAndUpdateStock] Undo Delete Error:', deleteError.message);
          }
        }
      } else {
        const { error: verificationError } = await supabase
          .from('inventory_count_verifications')
          .insert({
            inventory_item_id: itemId,
            counted_qty: countedQty,
            system_stock_qty: baselineStock,
            matched,
          });

        if (verificationError) {
          console.error(
            '[recordInventoryCountAndUpdateStock] Supabase Error:',
            verificationError.message,
            verificationError.details,
          );
          return { success: false, error: verificationError.message };
        }
      }
    }

    let newStock = countedQty;
    if (baselineStock !== countedQty) {
      const { data, error } = await supabase.rpc('set_inventory_stock', {
        p_item_id: itemId,
        p_new_stock: countedQty,
        p_note: 'Stock-taking count',
        p_record_history: false,
      });

      if (error) {
        const rpcMissing = error.message?.includes('set_inventory_stock') || error.code === '42883';
        if (rpcMissing) {
          const { error: updateErr } = await supabase
            .from('inventory_items')
            .update({ stock: countedQty, updated_at: new Date().toISOString() })
            .eq('id', itemId);

          if (updateErr) {
            console.error('[recordInventoryCountAndUpdateStock] Fallback update error:', updateErr.message, updateErr.details);
            return { success: false, error: updateErr.message };
          }
        } else {
          console.error('[recordInventoryCountAndUpdateStock] Supabase RPC Error:', error.message, error.details, error.hint);
          return { success: false, error: error.message };
        }
      } else {
        newStock = data?.new_stock ?? countedQty;
      }
    }

    await recordDataChange({
      action: 'UPDATE',
      module: 'inventory',
      entityType: 'inventory_item',
      entityId: itemId,
      entityLabel: itemRow?.name ?? null,
      fieldChanges: computeFieldChanges(
        { stock: baselineStock },
        { stock: newStock },
      ),
      metadata: withAuditMetadata(
        {
          operation: 'count_stock_save',
          note: 'Stock-taking count',
          recordHistory: false,
          itemName: itemRow?.name ?? null,
          order_point: itemRow?.order_point ?? null,
          countPolicy,
        },
        {
          ...options,
          notificationContext: 'inventory_count',
          suppressNotification: true,
        },
      ),
    });

    revalidatePath('/[locale]/inventory', 'page');
    revalidatePath('/[locale]/inventory/count', 'page');

    return {
      success: true,
      skipped: countPolicy !== 'exact_count',
      matched,
      systemStockQty: baselineStock,
      countedQty,
      newStock,
    };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error('[recordInventoryCountAndUpdateStock] Unexpected Error:', message);
    return {
      success: false,
      error: message || 'เกิดข้อผิดพลาดในการบันทึกผลตรวจนับ',
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

  const authError = await requireAuthenticatedRead();
  if (authError) {
    return { success: false, error: authError };
  }

  try {
    const { data: rows, error } = await supabase
      .from('inventory_count_verifications')
      .select('inventory_item_id, matched, system_stock_qty, counted_qty, counted_at')
      .order('counted_at', { ascending: false });

    if (error) {
      console.error('[fetchCountAccuracyStats] Supabase Error:', error.message, error.details);
      return { success: false, error: error.message };
    }

    const { data: exactItems, error: itemsError } = await supabase
      .from('inventory_items')
      .select('id, name, count_policy')
      .eq('count_policy', 'exact_count');

    if (itemsError) {
      console.error('[fetchCountAccuracyStats] Supabase Error:', itemsError.message, itemsError.details);
      return { success: false, error: itemsError.message };
    }

    const exactItemById = new Map(
      (exactItems ?? []).map((item: { id: string; name: string | null }) => [item.id, item.name]),
    );

    const perItem: Record<string, ItemCountAccuracyStats> = {};
    let overallTotal = 0;
    let overallMatch = 0;
    let overallDiscrepancy = 0;
    let overallCompared = 0;

    for (const row of rows ?? []) {
      const itemId = row.inventory_item_id as string;
      if (!exactItemById.has(itemId)) continue;

      if (!perItem[itemId]) {
        perItem[itemId] = {
          itemName: exactItemById.get(itemId) || 'ไม่ทราบชื่อสินค้า',
          totalChecks: 0,
          matchChecks: 0,
          accuracyPct: null,
          totalDiscrepancyQty: 0,
          totalComparedQty: 0,
          lastSystemStockQty: null,
          lastCountedQty: null,
          lastCountedAt: null,
          lastMatched: null,
        };
      }

      const stats = perItem[itemId];
      const systemStockQty = Number(row.system_stock_qty) || 0;
      const countedQty = Number(row.counted_qty) || 0;
      const discrepancyQty = computeCountDiscrepancy(countedQty, systemStockQty);
      const comparedQty = Math.max(countedQty, systemStockQty, 1);

      stats.totalChecks += 1;
      if (row.matched) stats.matchChecks += 1;
      stats.totalDiscrepancyQty += discrepancyQty;
      stats.totalComparedQty += comparedQty;

      if (stats.lastSystemStockQty === null) {
        stats.lastSystemStockQty = systemStockQty;
        stats.lastCountedQty = countedQty;
        stats.lastCountedAt = row.counted_at as string;
        stats.lastMatched = Boolean(row.matched);
      }
    }

    for (const stats of Object.values(perItem)) {
      stats.accuracyPct = computeAggregateCountAccuracyPct(
        stats.totalDiscrepancyQty,
        stats.totalComparedQty,
      );
      overallTotal += stats.totalChecks;
      overallMatch += stats.matchChecks;
      overallDiscrepancy += stats.totalDiscrepancyQty;
      overallCompared += stats.totalComparedQty;
    }

    return {
      success: true,
      data: {
        perItem,
        overall: {
          totalChecks: overallTotal,
          matchChecks: overallMatch,
          accuracyPct: computeAggregateCountAccuracyPct(overallDiscrepancy, overallCompared),
          totalDiscrepancyQty: overallDiscrepancy,
          totalComparedQty: overallCompared,
        },
      },
    };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error('[fetchCountAccuracyStats] Unexpected Error:', message);
    return {
      success: false,
      error: message || 'เกิดข้อผิดพลาดในการดึงสถิติความแม่นยำ',
    };
  }
}

export async function fetchInventoryAccuracyReport(): Promise<{
  success: boolean;
  data?: InventoryAccuracyReportResult;
  error?: string;
}> {
  const statsResult = await fetchCountAccuracyStats();
  if (!statsResult.success || !statsResult.data) {
    return { success: false, error: statsResult.error || 'เกิดข้อผิดพลาดในการดึงรายงานความแม่นยำ' };
  }

  const highDiscrepancyItems = Object.entries(statsResult.data.perItem)
    .map(([itemId, stats]) => ({ itemId, ...stats }))
    .filter((item) => item.totalDiscrepancyQty > 0)
    .sort((a, b) => {
      if (b.totalDiscrepancyQty !== a.totalDiscrepancyQty) {
        return b.totalDiscrepancyQty - a.totalDiscrepancyQty;
      }
      return (a.accuracyPct ?? 100) - (b.accuracyPct ?? 100);
    })
    .slice(0, 10);

  return {
    success: true,
    data: {
      ...statsResult.data,
      highDiscrepancyItems,
    },
  };
}
