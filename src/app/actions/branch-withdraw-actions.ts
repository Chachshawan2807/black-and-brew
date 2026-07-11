'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  buildBranchWithdrawNote,
  filterBranchWithdrawSaveLines,
  formatBranchWithdrawLineMessage,
  BRANCH_WITHDRAW_NOTE_PREFIX,
} from '@/lib/inventory-branch-withdraw-format';
import {
  requireMutationAccess,
  requireReadAccess,
} from '@/lib/policies/server-gate';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseAdminKey);

const saveLineSchema = z.object({
  itemId: z.string().uuid(),
  name: z.string().min(1),
  qtyBranch1: z.string(),
  qtyBranch2: z.string(),
  branch2Unit: z.string(),
});

const saveSchema = z.object({
  lines: z.array(saveLineSchema),
});

export type BranchWithdrawHistoryRow = {
  id: string;
  line_message: string;
  line_count: number;
  created_at: string;
};

export type BranchWithdrawDetailLine = {
  itemName: string;
  quantity: number;
  created_at: string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function saveBranchWithdrawal(raw: z.infer<typeof saveSchema>) {
  try {
    const authError = await requireMutationAccess();
    if (authError) return { success: false as const, error: authError };

    const parsed = saveSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false as const, error: 'ข้อมูลไม่ถูกต้อง' };
    }

    const filtered = filterBranchWithdrawSaveLines(parsed.data.lines);
    if (filtered.length === 0) {
      return { success: false as const, error: 'ไม่มีรายการที่บันทึก' };
    }

    const lineMessage = formatBranchWithdrawLineMessage(filtered);
    const rpcLines = filtered.map((line) => ({
      item_id: line.itemId,
      quantity: line.qtyBranch1,
    }));

    const { data, error } = await supabase.rpc('record_branch_withdrawal_batch', {
      p_line_message: lineMessage,
      p_lines: rpcLines,
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

    revalidatePath('/[locale]/inventory', 'page');
    revalidatePath('/[locale]/inventory/branch-withdraw', 'page');

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

export async function fetchBranchWithdrawalDetail(withdrawalId: string) {
  try {
    const authError = await requireReadAccess();
    if (authError) return { success: false as const, error: authError };

    const note = buildBranchWithdrawNote(withdrawalId);

    const { data, error } = await supabase
      .from('inventory_transactions')
      .select('quantity, created_at, inventory_items(name)')
      .eq('type', 'IN')
      .eq('note', note)
      .order('created_at', { ascending: true });

    if (error) {
      console.error(
        '[fetchBranchWithdrawalDetail] Supabase Error:',
        error.message,
        error.details,
      );
      return { success: false as const, error: error.message };
    }

    const lines: BranchWithdrawDetailLine[] = (data ?? []).map((row) => ({
      itemName: (row.inventory_items as { name?: string } | null)?.name ?? '—',
      quantity: Number(row.quantity) || 0,
      created_at: row.created_at as string,
    }));

    return { success: true as const, data: lines };
  } catch (error: unknown) {
    return { success: false as const, error: getErrorMessage(error) };
  }
}

export { BRANCH_WITHDRAW_NOTE_PREFIX };
