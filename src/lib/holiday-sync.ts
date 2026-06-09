import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const CALENDAR_ID = 'th.th#holiday@group.v.calendar.google.com';

const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

type GoogleCalendarEvent = {
  summary?: string;
  start?: {
    date?: string;
    dateTime?: string;
  };
};

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseAdminKey);
}

function groupHolidayNamesByDate(items: GoogleCalendarEvent[]): Map<string, string> {
  const grouped = new Map<string, string[]>();

  for (const item of items) {
    const date = item.start?.date || item.start?.dateTime?.split('T')[0];
    const name = item.summary?.trim();
    if (!date || !name) continue;

    const names = grouped.get(date) || [];
    names.push(name);
    grouped.set(date, names);
  }

  return new Map(
    [...grouped.entries()].map(([date, names]) => [
      date,
      [...new Set(names)].join(' / '),
    ])
  );
}

export async function fetchAndPersistHolidays(
  startDate: string,
  endDate: string
): Promise<{ success: true; count: number } | { success: false; error: string }> {
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'Missing API Key' };
  }

  const parsed = dateRangeSchema.safeParse({ startDate, endDate });
  if (!parsed.success) {
    return { success: false, error: 'Invalid date range' };
  }

  try {
    const timeMin = `${parsed.data.startDate}T00:00:00Z`;
    const timeMax = `${parsed.data.endDate}T23:59:59Z`;
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.items) {
      return { success: true, count: 0 };
    }

    const holidaysByDate = groupHolidayNamesByDate(data.items as GoogleCalendarEvent[]);
    const supabaseAdmin = getSupabaseAdmin();
    let syncedCount = 0;

    for (const [date, name] of holidaysByDate) {
      const { data: existing } = await supabaseAdmin
        .from('holidays')
        .select('id, name')
        .eq('date', date)
        .maybeSingle();

      if (!existing) {
        const { error: insertError } = await supabaseAdmin
          .from('holidays')
          .insert({ date, name });

        if (!insertError) syncedCount++;
        continue;
      }

      if (existing.name !== name) {
        const { error: updateError } = await supabaseAdmin
          .from('holidays')
          .update({ name })
          .eq('id', existing.id);

        if (!updateError) syncedCount++;
      }
    }

    return { success: true, count: syncedCount };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
