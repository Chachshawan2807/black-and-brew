'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { normalizeRegularHolidayDays } from '@/lib/regular-holidays';
import { fetchAndPersistHolidays } from '@/lib/holiday-sync';
import { assertWritableSession } from '@/app/actions/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);

async function ensureAuthorized() {
  const cookieStore = await cookies();
  const token = cookieStore.get('sb-access-token')?.value;
  const pinVerified = cookieStore.get('bb_auth_pin_verified')?.value === 'true';

  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (!pinVerified && (!user || authError)) {
    return { success: false, error: 'Unauthorized: Session missing or invalid' } as const;
  }

  const writable = await assertWritableSession();
  if (!writable.ok) {
    return { success: false, error: writable.error } as const;
  }

  return { success: true } as const;
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
