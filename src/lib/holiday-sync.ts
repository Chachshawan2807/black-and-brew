import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase-server';

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
    ]),
  );
}

export async function fetchAndPersistHolidays(
  startDate: string,
  endDate: string,
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
    if (holidaysByDate.size === 0) {
      return { success: true, count: 0 };
    }

    const supabaseAdmin = getSupabaseAdmin();
    const dates = [...holidaysByDate.keys()];

    const { data: existingRows, error: existingError } = await supabaseAdmin
      .from('holidays')
      .select('id, date, name')
      .in('date', dates);

    if (existingError) {
      return { success: false, error: existingError.message };
    }

    const existingByDate = new Map(
      (existingRows ?? []).map((row: { id: string; date: string; name: string }) => [row.date, row]),
    );

    const toInsert: { date: string; name: string }[] = [];
    const toUpdate: { id: string; name: string }[] = [];

    for (const [date, name] of holidaysByDate) {
      const existing = existingByDate.get(date);
      if (!existing) {
        toInsert.push({ date, name });
        continue;
      }
      if (existing.name !== name) {
        toUpdate.push({ id: existing.id, name });
      }
    }

    let syncedCount = 0;

    if (toInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin.from('holidays').insert(toInsert);
      if (insertError) {
        return { success: false, error: insertError.message };
      }
      syncedCount += toInsert.length;
    }

    if (toUpdate.length > 0) {
      const results = await Promise.all(
        toUpdate.map((row) =>
          supabaseAdmin.from('holidays').update({ name: row.name }).eq('id', row.id),
        ),
      );
      const updateError = results.find((r) => r.error)?.error;
      if (updateError) {
        return { success: false, error: updateError.message };
      }
      syncedCount += toUpdate.length;
    }

    return { success: true, count: syncedCount };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
