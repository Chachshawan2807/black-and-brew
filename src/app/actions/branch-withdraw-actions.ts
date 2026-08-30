'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { z } from 'zod';
import { recordDataChange } from '@/app/actions/data-change-log-actions';
import {
  buildBranchWithdrawNote,
  filterBranchWithdrawSaveLines,
  formatBranchWithdrawLineMessage,
  type BranchWithdrawFormatLine,
} from '@/lib/inventory-branch-withdraw-format';
import { INVENTORY_ITEM_SELECT } from '@/lib/inventory-queries';
import { INVENTORY_NOTIFICATION_SOURCES } from '@/lib/inventory-notification-filter';
import { evaluateAuthz, subjectFromServerAuth } from '@/lib/policies/authz';
import { requireReadAccess } from '@/lib/policies/server-gate';
import { ensureServerSession } from '@/lib/security/server-auth';
import { getSupabaseAdmin } from '@/lib/supabase-server';

const saveLineSchema = z.object({
  itemId: z.string().uuid(),
  name: z.string().min(1),
  qtyBranch1: z.string(),
  qtyBranch2: z.string(),
  branch2Unit: z.string(),
});

const saveSchema = z.object({
  lines: z.array(saveLineSchema),
  clientSessionId: z.string().max(120).optional(),
});

type InventoryItemSnapshot = {
  id: string;
  name: string;
  stock: number;
  order_point: number | null;
};

async function loadBranchWithdrawItemSnapshots(
  itemIds: string[],
): Promise<Map<string, InventoryItemSnapshot> | { error: string }> {
  if (itemIds.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, name, stock, order_point')
    .in('id', itemIds);

  if (error) {
    console.error('[loadBranchWithdrawItemSnapshots] Supabase Error:', error.message, error.details);
    return { error: error.message };
  }

  return new Map(
    (data ?? []).map((item) => [
      item.id as string,
      {
        id: item.id as string,
        name: (item.name as string) ?? ' ',
        stock: Number(item.stock) || 0,
        order_point: item.order_point == null ? null : Number(item.order_point),
      },
    ]),
  );
}

function toBranchWithdrawFormatLines(
  filtered: ReturnType<typeof filterBranchWithdrawSaveLines>,
): BranchWithdrawFormatLine[] {
  return filtered.map((line) => ({
    name: line.name,
    qtyBranch1: line.qtyBranch1,
    qtyBranch2: line.qtyBranch2,
    branch2Unit: line.branch2Unit,
  }));
}

async function recordBranchWithdrawInventoryNotifications(
  filtered: ReturnType<typeof filterBranchWithdrawSaveLines>,
  itemsById: Map<string, InventoryItemSnapshot>,
  withdrawalId: string,
  clientSessionId?: string,
) {
  const note = buildBranchWithdrawNote(withdrawalId);
  const metadataBase: Record<string, unknown> = {
    operation: 'record_transaction',
    type: 'IN',
    note,
    bulk: filtered.length > 1,
    branchWithdrawId: withdrawalId,
    notificationSource: INVENTORY_NOTIFICATION_SOURCES.BRANCH_WITHDRAW,
  };
  if (clientSessionId) {
    metadataBase.clientSessionId = clientSessionId;
  }

  const auditTasks: Array<() => Promise<unknown>> = [];

  for (const line of filtered) {
    const item = itemsById.get(line.itemId);
    if (!item) continue;

    const newStock = item.stock;
    const oldStock = newStock - line.qtyBranch1;

    auditTasks.push(() =>
      recordDataChange({
        action: 'UPDATE',
        module: 'inventory',
        entityType: 'inventory_item',
        entityId: line.itemId,
        entityLabel: item.name,
        fieldChanges: [
          {
            field: 'stock',
            old_value: oldStock,
            new_value: newStock,
          },
        ],
        metadata: {
          ...metadataBase,
          quantity: line.qtyBranch1,
          itemName: item.name,
          order_point: item.order_point,
        },
      }),
    );
  }

  await Promise.all(auditTasks.map((task) => task()));
}

export type BranchWithdrawHistoryRow = {
  id: string;
  line_message: string;
  line_count: number;
  created_at: string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function saveBranchWithdrawal(raw: z.infer<typeof saveSchema>) {
  try {
    const auth = await ensureServerSession();
    if (!auth.ok) return { success: false as const, error: auth.error };
    const mutateDecision = evaluateAuthz(subjectFromServerAuth(auth), 'mutate');
    if (!mutateDecision.allow) {
      return { success: false as const, error: mutateDecision.reason };
    }

    const parsed = saveSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false as const, error: 'ข้อมูลไม่ถูกต้อง' };
    }

    const filtered = filterBranchWithdrawSaveLines(parsed.data.lines);
    if (filtered.length === 0) {
      return { success: false as const, error: 'ไม่มีรายการที่บันทึก' };
    }

    const lineMessage = formatBranchWithdrawLineMessage(toBranchWithdrawFormatLines(filtered));
    const rpcLines = filtered.map((line) => ({
      item_id: line.itemId,
      quantity: line.qtyBranch1,
    }));

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('record_branch_withdrawal_batch', {
      p_line_message: lineMessage,
      p_lines: rpcLines,
      p_created_by: auth.userId ?? null,
    });

    if (error) {
      console.error(
        '[saveBranchWithdrawal] Supabase RPC Error:',
        error.message,
        error.details,
        error.hint,
      );
      return { success: false as const, error: error.message };
    }

    const withdrawalId = String(data?.withdrawal_id ?? '');
    if (withdrawalId) {
      const deferredFiltered = filtered;
      const deferredClientSessionId = parsed.data.clientSessionId;
      after(async () => {
        try {
          const itemSnapshots = await loadBranchWithdrawItemSnapshots(
            deferredFiltered.map((line) => line.itemId),
          );
          if ('error' in itemSnapshots) {
            console.error(
              '[saveBranchWithdrawal] Deferred snapshot error:',
              itemSnapshots.error,
            );
            return;
          }

          await recordBranchWithdrawInventoryNotifications(
            deferredFiltered,
            itemSnapshots,
            withdrawalId,
            deferredClientSessionId,
          );
          revalidatePath('/[locale]/inventory', 'page');
          revalidatePath('/[locale]/inventory/branch-withdraw', 'page');
        } catch (deferredError) {
          console.error(
            '[saveBranchWithdrawal] Deferred notification error:',
            getErrorMessage(deferredError),
          );
        }
      });
    }

    return {
      success: true as const,
      withdrawalId: data?.withdrawal_id as string,
      lineMessage: (data?.line_message as string) ?? lineMessage,
    };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error('[saveBranchWithdrawal] Unexpected Error:', message);
    return {
      success: false as const,
      error: message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
    };
  }
}

export async function fetchBranchWithdrawalHistory(limit = 30) {
  try {
    const authError = await requireReadAccess();
    if (authError) {
      return {
        success: false as const,
        error: authError,
        data: [] as BranchWithdrawHistoryRow[],
      };
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('inventory_branch_withdrawals')
      .select('id, line_message, line_count, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error(
        '[fetchBranchWithdrawalHistory] Supabase Error:',
        error.message,
        error.details,
      );
      return {
        success: false as const,
        error: error.message,
        data: [] as BranchWithdrawHistoryRow[],
      };
    }

    return { success: true as const, data: (data ?? []) as BranchWithdrawHistoryRow[] };
  } catch (error: unknown) {
    return {
      success: false as const,
      error: getErrorMessage(error),
      data: [] as BranchWithdrawHistoryRow[],
    };
  }
}

export async function fetchBranchWithdrawInventoryItems() {
  try {
    const authError = await requireReadAccess();
    if (authError) {
      return {
        success: false as const,
        error: authError,
        data: [],
      };
    }

    const { data, error } = await getSupabaseAdmin()
      .from('inventory_items')
      .select(INVENTORY_ITEM_SELECT)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error(
        '[fetchBranchWithdrawInventoryItems] Supabase Error:',
        error.message,
        error.details,
      );
      return {
        success: false as const,
        error: error.message,
        data: [],
      };
    }

    return { success: true as const, data: data ?? [] };
  } catch (error: unknown) {
    return {
      success: false as const,
      error: getErrorMessage(error),
      data: [],
    };
  }
}
