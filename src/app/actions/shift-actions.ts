'use server';

import { revalidatePath, unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { z } from 'zod';

// กำหนด Admin Client เพื่อทะลวง RLS สำหรับระบบที่ใช้ PIN Auth
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);

export async function deleteShift(id: string) {
  if (!id) return { success: false, error: 'Missing shift ID' };
  try {
    const { error } = await supabaseAdmin.from('shifts').delete().eq('id', id);
    if (error) return { success: false, error: error.message };

    revalidateAppPaths();
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: errorMsg };
  }
}

export async function updateStaffOrder(orderedIds: string[]) {
  if (!orderedIds || orderedIds.length === 0) return { success: false, error: 'Empty order list' };
  try {
    const updates = orderedIds.map((id, index) =>
      supabaseAdmin.from('profiles').update({ schedule_order: index, display_order: index }).eq('id', id)
    );
    const results = await Promise.all(updates);
    const firstError = results.find(r => r.error);
    if (firstError) return { success: false, error: firstError.error?.message || 'Unknown error' };

    revalidatePath('/[locale]/schedule', 'page');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateDashboardOrder(orderedIds: string[]) {
  if (!orderedIds || orderedIds.length === 0) return { success: false, error: 'Empty order list' };
  try {
    const updates = orderedIds.map((id, index) =>
      supabaseAdmin.from('profiles').update({ dashboard_order: index }).eq('id', id)
    );
    await Promise.all(updates);
    revalidatePath('/[locale]/dashboard', 'page');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function revalidateAppPaths() {
  revalidatePath('/', 'layout');
  revalidatePath('/[locale]/schedule', 'page');
  revalidatePath('/[locale]/dashboard', 'page');
}

const shiftSchema = z.object({
  id: z.string().optional(),
  employee_id: z.string(),
  start_time: z.string(),
  end_time: z.string().optional(),
  status: z.string(),
  metadata: z.any().optional()
});

export async function saveShift(payload: any) {
  noStore();

  const cookieStore = await cookies();
  const token = cookieStore.get('sb-access-token')?.value;
  const pinVerified = cookieStore.get('bb_auth_pin_verified')?.value === 'true';

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (!pinVerified && (!user || authError)) {
    return { success: false, error: 'Unauthorized: Session missing or invalid' };
  }

  const parsed = shiftSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: 'Invalid payload structure' };
  }

  const datePart = parsed.data.start_time.split('T')[0];
  const cleanStartTime = datePart + 'T00:00:00';
  const cleanEndTime = datePart + 'T23:59:59';

  try {
    const { data, error } = await supabaseAdmin
      .from('shifts')
      .upsert({
        id: payload.id || undefined,
        employee_id: payload.employee_id,
        start_time: cleanStartTime,
        end_time: cleanEndTime,
        status: payload.status,
        metadata: payload.metadata
      }, { onConflict: 'employee_id,start_time' })
      .select()
      .single();

    if (error) {
      console.error('[saveShift] Upsert Error:', error);
      return { success: false, error: error.message };
    }

    revalidateAppPaths();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function deleteManagementHistoryRange(employeeId: string, startDate: string, endDate: string) {
  if (!employeeId || !startDate || !endDate) return { success: false, error: 'Missing parameters' };
  try {
    const { error } = await supabaseAdmin
      .from('shifts')
      .delete()
      .eq('employee_id', employeeId)
      .eq('metadata->is_management', true)
      .gte('start_time', `${startDate.split('T')[0]}T00:00:00`)
      .lte('start_time', `${endDate.split('T')[0]}T23:59:59`);

    if (error) {
      console.error('[deleteManagementHistoryRange] Supabase Error:', error.message, error);
      throw error;
    }

    revalidateAppPaths();
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: errorMsg };
  }
}
