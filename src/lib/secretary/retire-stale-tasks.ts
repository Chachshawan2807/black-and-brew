import { getSupabaseAdmin } from '@/lib/supabase-server';

export type StaleSkipReason =
  | 'stale_derived'
  | 'stale_ai'
  | 'legacy_bean_orders'
  | 'branch2_inactive';

export function buildAutoSkippedMetadata(
  prior: Record<string, unknown> | null | undefined,
  reason: StaleSkipReason,
): Record<string, unknown> {
  const next = { ...(prior ?? {}) };
  delete next.autoCompleted;
  return {
    ...next,
    autoSkipped: true,
    autoSkippedAt: new Date().toISOString(),
    autoSkippedReason: reason,
  };
}

/** Legacy autoCompleted rows or new autoSkipped rows were retired by sync, not by the user. */
export function isSystemRetiredMetadata(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  return metadata?.autoSkipped === true || metadata?.autoCompleted === true;
}

export function isRowEligibleForStaleSkip(row: {
  status: string;
  metadata?: Record<string, unknown> | null;
}): boolean {
  if (row.status === 'pending' || row.status === 'in_progress') {
    return true;
  }
  if (row.status === 'done' && row.metadata?.autoCompleted === true) {
    return true;
  }
  return false;
}

/** Remove stale secretary tasks from the active board without marking them user-done. */
export async function skipStaleSecretaryTaskIds(
  taskIds: string[],
  reason: StaleSkipReason,
): Promise<number> {
  if (taskIds.length === 0) return 0;

  const admin = getSupabaseAdmin();
  const { data: rows, error: fetchError } = await admin
    .from('operational_tasks')
    .select('id, metadata')
    .in('id', taskIds);

  if (fetchError) {
    console.error('Supabase Error:', fetchError.message, fetchError.details);
    throw fetchError;
  }

  const now = new Date().toISOString();
  let skipped = 0;

  for (const row of rows ?? []) {
    const { error } = await admin
      .from('operational_tasks')
      .update({
        status: 'skipped',
        completed_at: null,
        completed_by: null,
        active_session_started_at: null,
        updated_at: now,
        metadata: buildAutoSkippedMetadata(
          (row.metadata as Record<string, unknown> | null) ?? null,
          reason,
        ),
      })
      .eq('id', String(row.id));

    if (error) {
      console.error('Supabase Error:', error.message, error.details);
      throw error;
    }

    skipped += 1;
  }

  return skipped;
}
