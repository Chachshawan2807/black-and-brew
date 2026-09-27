import { getSupabaseAdmin } from '@/lib/supabase-server';

/** Move open manual tasks onto the current work day so they stay on the home board. */
export async function rollForwardOpenManualSecretaryTasks(
  dateIso: string,
): Promise<{ rolled: number }> {
  const now = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from('operational_tasks')
    .update({
      scheduled_date: dateIso,
      updated_at: now,
    })
    .eq('source_kind', 'manual')
    .in('status', ['pending', 'in_progress'])
    .lt('scheduled_date', dateIso)
    .select('id');

  if (error) {
    console.error('Supabase Error:', error.message, error.details);
    throw error;
  }

  return { rolled: data?.length ?? 0 };
}

/** Include today rows plus open manual tasks still scheduled on earlier days. */
export function secretaryTasksForWorkDayOrFilter(dateIso: string, nowIso: string): string {
  return [
    `and(scheduled_date.eq.${dateIso},or(snoozed_until.is.null,snoozed_until.lte.${nowIso}))`,
    `and(source_kind.eq.manual,scheduled_date.lt.${dateIso},status.in.(pending,in_progress),or(snoozed_until.is.null,snoozed_until.lte.${nowIso}))`,
  ].join(',');
}
