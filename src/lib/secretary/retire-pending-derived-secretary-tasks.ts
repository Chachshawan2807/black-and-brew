import {
  isRowEligibleForStaleSkip,
  skipStaleSecretaryTaskIds,
} from '@/lib/secretary/retire-stale-tasks';
import { getSupabaseAdmin } from '@/lib/supabase-server';

/** Marks active derived operational_tasks as skipped for the work day (manual board only). */
export async function retirePendingDerivedSecretaryTasks(dateIso: string): Promise<{
  success: boolean;
  retired?: number;
  error?: string;
}> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('operational_tasks')
      .select('id, status, metadata')
      .eq('scheduled_date', dateIso)
      .eq('source_kind', 'derived')
      .in('status', ['pending', 'in_progress']);

    if (error) {
      console.error('Supabase Error:', error.message, error.details);
      return { success: false, error: error.message };
    }

    const taskIds = (data ?? [])
      .filter((row) =>
        isRowEligibleForStaleSkip({
          status: String(row.status),
          metadata: (row.metadata as Record<string, unknown> | null) ?? null,
        }),
      )
      .map((row) => String(row.id));

    const retired = await skipStaleSecretaryTaskIds(taskIds, 'stale_derived');
    return { success: true, retired };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[retirePendingDerivedSecretaryTasks]', message);
    return { success: false, error: message };
  }
}
