'use server';

import { z } from 'zod';
import { gateMutation, requireReadAccess } from '@/lib/policies/server-gate';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { parseSidebarMenuOrder } from '@/lib/sidebar-menu-order';
import { logSupabaseError, toUserFacingError } from '@/lib/user-facing-error';

const menuOrderSchema = z.array(z.string().min(1)).max(50);

function resolveBranchId(): string {
  return process.env.NEXT_PUBLIC_STORE_BRANCH_ID?.trim() || 'main';
}

export type SidebarMenuOrderResult =
  | { success: true; orderIds: string[] | null; updatedAt: string | null }
  | { success: false; error: string };

export type SaveSidebarMenuOrderResult =
  | { success: true; updatedAt: string }
  | { success: false; error: string };

export async function getSidebarMenuOrder(): Promise<SidebarMenuOrderResult> {
  const authError = await requireReadAccess();
  if (authError) {
    return { success: false, error: authError };
  }

  try {
    const { data, error } = await getSupabaseAdmin()
      .from('app_preferences')
      .select('sidebar_menu_order, updated_at')
      .eq('branch_id', resolveBranchId())
      .maybeSingle();

    if (error) {
      logSupabaseError('getSidebarMenuOrder', error);
      return {
        success: false,
        error: toUserFacingError(error, 'โหลดลำดับเมนูไม่สำเร็จ'),
      };
    }

    const rawOrder = data?.sidebar_menu_order;
    const orderIds = Array.isArray(rawOrder)
      ? parseSidebarMenuOrder(JSON.stringify(rawOrder))
      : null;

    return {
      success: true,
      orderIds,
      updatedAt: data?.updated_at ?? null,
    };
  } catch (error) {
    logSupabaseError('getSidebarMenuOrder', error);
    return {
      success: false,
      error: toUserFacingError(error, 'โหลดลำดับเมนูไม่สำเร็จ'),
    };
  }
}

export async function saveSidebarMenuOrder(
  orderIds: string[],
): Promise<SaveSidebarMenuOrderResult> {
  const auth = await gateMutation();
  if (!auth.success) {
    return auth;
  }

  const parsed = menuOrderSchema.safeParse(orderIds);
  if (!parsed.success) {
    return { success: false, error: 'ลำดับเมนูไม่ถูกต้อง' };
  }

  try {
    const updatedAt = new Date().toISOString();
    const { error } = await getSupabaseAdmin()
      .from('app_preferences')
      .upsert(
        {
          branch_id: resolveBranchId(),
          sidebar_menu_order: parsed.data,
          updated_at: updatedAt,
        },
        { onConflict: 'branch_id' },
      );

    if (error) {
      logSupabaseError('saveSidebarMenuOrder', error);
      return {
        success: false,
        error: toUserFacingError(error, 'บันทึกลำดับเมนูไม่สำเร็จ'),
      };
    }

    return { success: true, updatedAt };
  } catch (error) {
    logSupabaseError('saveSidebarMenuOrder', error);
    return {
      success: false,
      error: toUserFacingError(error, 'บันทึกลำดับเมนูไม่สำเร็จ'),
    };
  }
}
