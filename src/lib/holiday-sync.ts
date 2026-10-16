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

type GoogleCalendarEventsResponse = {
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
  error?: { message?: string };
};

const FIXED_THAI_HOLIDAYS: Record<string, string> = {
  '01-01': 'วันขึ้นปีใหม่',
  '04-06': 'วันจักรี',
  '04-13': 'วันสงกรานต์',
  '04-14': 'วันสงกรานต์',
  '04-15': 'วันสงกรานต์',
  '05-01': 'วันแรงงานแห่งชาติ',
  '05-04': 'วันฉัตรมงคล',
  '06-03': 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี',
  '07-28': 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว',
  '08-12': 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง',
  '10-13': 'วันนวมินทรมหาราช',
  '10-23': 'วันปิยมหาราช',
  '12-05': 'วันคล้ายวันพระบรมราชสมภพ รัชกาลที่ 9',
  '12-10': 'วันรัฐธรรมนูญ',
  '12-31': 'วันสิ้นปี',
};

const OVERRIDE_THAI_HOLIDAYS: Record<string, string> = {
  '2027-01-01': 'วันขึ้นปีใหม่',
  '2027-02-22': 'ชดเชยวันมาฆบูชา',
  '2027-04-06': 'วันจักรี',
  '2027-04-13': 'วันสงกรานต์',
  '2027-04-14': 'วันสงกรานต์',
  '2027-04-15': 'วันสงกรานต์',
  '2027-05-03': 'ชดเชยวันแรงงานแห่งชาติ',
  '2027-05-04': 'วันฉัตรมงคล',
  '2027-05-20': 'วันวิสาขบูชา',
  '2027-06-03': 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี',
  '2027-07-19': 'ชดเชยวันอาสาฬหบูชา',
  '2027-07-28': 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว',
  '2027-08-12': 'วันแม่แห่งชาติ',
  '2027-10-13': 'วันนวมินทรมหาราช',
  '2027-10-25': 'ชดเชยวันปิยมหาราช',
  '2027-12-06': 'ชดเชยวันชาติและวันพ่อแห่งชาติ',
  '2027-12-10': 'วันรัฐธรรมนูญ',
  '2027-12-31': 'วันสิ้นปี',
};

function getKnownThaiHolidays(startDate: string, endDate: string): Map<string, string> {
  const holidays = new Map<string, string>();
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  for (const day = new Date(start); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    const date = day.toISOString().slice(0, 10);
    if (date.startsWith('2027-')) {
      const override = OVERRIDE_THAI_HOLIDAYS[date];
      if (override) holidays.set(date, override);
      continue;
    }
    const holiday = FIXED_THAI_HOLIDAYS[date.slice(5)];
    if (holiday) holidays.set(date, holiday);
  }

  return holidays;
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
    const timeMin = new Date(`${parsed.data.startDate}T00:00:00+07:00`).toISOString();
    const exclusiveEndDate = new Date(`${parsed.data.endDate}T00:00:00.000Z`);
    exclusiveEndDate.setUTCDate(exclusiveEndDate.getUTCDate() + 1);
    const timeMax = new Date(`${exclusiveEndDate.toISOString().slice(0, 10)}T00:00:00+07:00`).toISOString();
    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`;
    const items: GoogleCalendarEvent[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL(baseUrl);
      url.searchParams.set('key', apiKey);
      url.searchParams.set('timeMin', timeMin);
      url.searchParams.set('timeMax', timeMax);
      url.searchParams.set('singleEvents', 'true');
      url.searchParams.set('maxResults', '2500');
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const response = await fetch(url.toString(), { signal: AbortSignal.timeout(5_000) });
      const data = await response.json() as GoogleCalendarEventsResponse;

      if (!response.ok) {
        const message = typeof data?.error?.message === 'string' ? data.error.message : response.statusText;
        return { success: false, error: `Google Calendar API error (${response.status}): ${message}` };
      }

      if (!Array.isArray(data.items)) {
        return { success: false, error: 'Google Calendar API returned an invalid response' };
      }

      items.push(...data.items);
      pageToken = data.nextPageToken;
    } while (pageToken);

    const holidaysByDate = groupHolidayNamesByDate(items);
    for (const [date, name] of getKnownThaiHolidays(parsed.data.startDate, parsed.data.endDate)) {
      const existingName = holidaysByDate.get(date);
      const mergedNames = [...new Set([...(existingName?.split(' / ') ?? []), name])];
      holidaysByDate.set(date, mergedNames.join(' / '));
    }
    if (holidaysByDate.size === 0) return { success: true, count: 0 };

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

    for (const [date, name] of holidaysByDate) {
      const existing = existingByDate.get(date);
      if (!existing) {
        toInsert.push({ date, name });
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

    return { success: true, count: syncedCount };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
