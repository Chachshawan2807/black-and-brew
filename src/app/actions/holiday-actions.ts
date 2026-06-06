'use server';

import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { normalizeRegularHolidayDays } from '@/lib/regular-holidays';
import { assertWritableSession } from '@/app/actions/auth';

const CALENDAR_ID = 'th.th#holiday@group.v.calendar.google.com';
const API_KEY = process.env.GOOGLE_CALENDAR_API_KEY;

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

  if (!API_KEY) {
    // Missing API Key
    return { success: false, error: 'Missing API Key' };
  }

  try {
    // 1. Fetch from Google Calendar API
    const timeMin = `${parsed.data.startDate}T00:00:00Z`;
    const timeMax = `${parsed.data.endDate}T23:59:59Z`;
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?key=${API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.items) {
      // No holidays found or API error
      return { success: true, count: 0 };
    }

    // 2. Map and Insert into Supabase (Skip if exists)
    let syncedCount = 0;
    for (const item of data.items) {
      const date = item.start.date || item.start.dateTime.split('T')[0];
      const name = item.summary;

      // Check if already exists
      const { data: existing } = await supabaseAdmin
        .from('holidays')
        .select('id')
        .eq('date', date)
        .single();

      if (!existing) {
        const { error: insertError } = await supabaseAdmin
          .from('holidays')
          .insert({ date, name });
        
        if (!insertError) syncedCount++;
      }
    }

    if (syncedCount > 0) {
      revalidatePath('/', 'layout');
    }

    return { success: true, count: syncedCount };
  } catch (error) {
    // Error during sync
    return { success: false, error: String(error) };
  }
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
