'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath, unstable_noStore as noStore } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);

/**
 * Server Action: deleteShift
 * Directly deletes a shift row by ID from the database.
 * Optimized for UI-UX-PRO-MAX standards with immediate feedback.
 */
export async function deleteShift(id: string) {
  if (!id) {
    return { success: false, error: 'Missing shift ID' };
  }

  try {
    const { error } = await supabaseAdmin
      .from('shifts')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    // Revalidate paths to clear cache and update UI across the app
    revalidatePath('/');
    revalidatePath('/[locale]/schedule', 'page');
    revalidatePath('/[locale]/dashboard', 'page');
    
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: errorMsg };
  }
}


/**
 * Server Action: updateStaffOrder
 * Updates the display_order of multiple profiles atomically.
 * Uses Service Role to bypass RLS for administrative ordering.
 */
export async function updateStaffOrder(orderedIds: string[]) {
  noStore();
  if (!orderedIds || orderedIds.length === 0) return { success: false, error: 'Empty order list' };

  try {
    // Perform updates in parallel using Service Role
    const updates = orderedIds.map((id, index) => 
      supabaseAdmin
        .from('profiles')
        .update({ 
          schedule_order: index,
          display_order: index // Sync both for compatibility
        })
        .eq('id', id)
    );

    const results = await Promise.all(updates);
    const firstError = results.find(r => r.error);
    
    if (firstError) {
      console.error('[updateStaffOrder] Supabase Error:', firstError.error?.message);
      return { success: false, error: firstError.error?.message || 'Unknown error' };
    }

    revalidatePath('/[locale]/schedule', 'page');
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[updateStaffOrder] Critical Error:', errorMsg);
    return { success: false, error: errorMsg };
  }
}



/**
 * Server Action: updateDashboardOrder
 * Updates the dashboard_order of multiple profiles atomically.
 */
export async function updateDashboardOrder(orderedIds: string[]) {
  noStore();
  if (!orderedIds || orderedIds.length === 0) return { success: false, error: 'Empty order list' };

  try {
    const updates = orderedIds.map((id, index) => 
      supabaseAdmin
        .from('profiles')
        .update({ dashboard_order: index })
        .eq('id', id)
    );

    await Promise.all(updates);
    revalidatePath('/[locale]/dashboard', 'page');
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function revalidateAppPaths() {
  revalidatePath('/');
  revalidatePath('/[locale]/schedule', 'page');
  revalidatePath('/[locale]/dashboard', 'page');
}
