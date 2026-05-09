'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

const CALENDAR_ID = 'th.th#holiday@group.v.calendar.google.com';
const API_KEY = process.env.GOOGLE_CALENDAR_API_KEY;

export async function syncHolidays(startDate: string, endDate: string) {
  if (!API_KEY) {
    // Missing API Key
    return { success: false, error: 'Missing API Key' };
  }

  try {
    // 1. Fetch from Google Calendar API
    const timeMin = `${startDate}T00:00:00Z`;
    const timeMax = `${endDate}T23:59:59Z`;
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
      const { data: existing } = await supabase
        .from('holidays')
        .select('id')
        .eq('date', date)
        .single();

      if (!existing) {
        const { error: insertError } = await supabase
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
