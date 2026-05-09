'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

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
    const { error } = await supabase
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

export async function revalidateAppPaths() {
  revalidatePath('/');
  revalidatePath('/[locale]/schedule', 'page');
  revalidatePath('/[locale]/dashboard', 'page');
}

