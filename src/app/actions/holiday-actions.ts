'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { normalizeRegularHolidayDays } from '@/lib/regular-holidays';
import { fetchAndPersistHolidays } from '@/lib/holiday-sync';
import { recordDataChange } from '@/app/actions/data-change-log-actions';
import { gateMutation } from '@/lib/policies/server-gate';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);

async function ensureAuthorized() {
  return gateMutation();
}

const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function syncHolidays(startDate: string, endDate: string) {
  const auth = await ensureAuthorized();
  if (!auth.success) {
    return auth;
  }

  const parsed = dateRangeSchema.safeParse({ startDate, endDate });
  if (!parsed.success) {
    return { success: false, error: 'Invalid date range' };
  }

  const result = await fetchAndPersistHolidays(parsed.data.startDate, parsed.data.endDate);
  if (result.success && result.count > 0) {
    await recordDataChange({
      action: 'BULK_UPDATE',
      module: 'holiday',
      entityType: 'holiday',
      metadata: {
        operation: 'sync_holidays',
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        count: result.count,
      },
    });
    revalidatePath('/', 'layout');
    revalidatePath('/[locale]/schedule', 'page');
  }

  return result;
}

export async function saveRegularHolidays(profileId: string, days: number[]) {
  if (!profileId) {
    return { success: false, error: 'Missing profile ID' };
  }

  const auth = await ensureAuthorized();
  if (!auth.success) {
    return auth;
  }

  const normalizedDays = normalizeRegularHolidayDays(days);

  try {
    const { data: beforeDays } = await supabaseAdmin
      .from('regular_holidays')
      .select('day_of_week')
      .eq('profile_id', profileId);

    const { error: deleteError } = await supabaseAdmin
      .from('regular_holidays')
      .delete()
      .eq('profile_id', profileId);

    if (deleteError) {
      console.error('Supabase Error:', deleteError.message, deleteError.details);
      throw deleteError;
    }

    if (normalizedDays.length > 0) {
      const rows = normalizedDays.map((dayOfWeek) => ({
        profile_id: profileId,
        day_of_week: dayOfWeek,
      }));

      const { error: insertError } = await supabaseAdmin
        .from('regular_holidays')
        .insert(rows);

      if (insertError) {
        console.error('Supabase Error:', insertError.message, insertError.details);
        throw insertError;
      }
    }

    await recordDataChange({
      action: 'UPDATE',
      module: 'holiday',
      entityType: 'regular_holiday',
      entityId: profileId,
      fieldChanges: [
        {
          field: 'days',
          old_value: (beforeDays ?? []).map((row) => row.day_of_week),
          new_value: normalizedDays,
        },
      ],
      metadata: { operation: 'save_regular_holidays' },
    });

    revalidatePath('/', 'layout');
    revalidatePath('/[locale]/schedule', 'page');

    return { success: true, data: normalizedDays };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save regular holidays',
    };
  }
}
