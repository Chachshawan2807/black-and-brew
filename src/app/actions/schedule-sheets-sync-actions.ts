'use server';

import { addDays, format, startOfWeek } from 'date-fns';
import { z } from 'zod';
import { requireMutationAccess } from '@/lib/policies/server-gate';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import {
  getConfiguredSheetTabNameOverride,
  isGoogleSheetsSyncConfigured,
  listGoogleSheetTabTitles,
  quoteSheetRange,
  readGoogleSheetValues,
  writeGoogleSheetUpdates,
} from '@/lib/google/sheets-api';
import { buildScheduleSheetsUpdates } from '@/lib/schedule/sheets-week-layout';
import { buildMonthlySheetTabSearchOrder } from '@/lib/schedule/sheets-month-tab';
import {
  buildWeekDayIsoStrings,
  deriveWeekBlockLayout,
  findWeekBlockDateRow,
  weekDayNumbersFromIsoDates,
} from '@/lib/schedule/sheets-week-block';
import { SHEETS_WEEK_BLOCK_SCAN_MAX_ROW } from '@/lib/schedule/sheets-layout-config';

const weekStartSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function syncScheduleToGoogleSheet(weekStartMonday: string) {
  const authError = await requireMutationAccess();
  if (authError) {
    return { success: false as const, error: authError };
  }

  if (!isGoogleSheetsSyncConfigured()) {
    return {
      success: false as const,
      error: 'ยังไม่ได้ตั้งค่า Google Sheets (GOOGLE_SHEETS_SPREADSHEET_ID / service account)',
    };
  }

  const parsedWeek = weekStartSchema.safeParse(weekStartMonday);
  if (!parsedWeek.success) {
    return { success: false as const, error: 'รูปแบบวันเริ่มสัปดาห์ไม่ถูกต้อง' };
  }

  const monday = startOfWeek(new Date(parsedWeek.data), { weekStartsOn: 1 });
  const mondayStr = format(monday, 'yyyy-MM-dd');
  const sundayStr = format(addDays(monday, 6), 'yyyy-MM-dd');

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const [profilesRes, shiftsRes] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('id, full_name, schedule_order')
        .order('schedule_order', { ascending: true }),
      supabaseAdmin
        .from('shifts')
        .select('employee_id, start_time, status, metadata')
        .gte('start_time', `${mondayStr}T00:00:00`)
        .lte('start_time', `${sundayStr}T23:59:59`)
        .not('status', 'is', null)
        .not('status', 'eq', '')
        .not('metadata->>location', 'is', null)
        .not('metadata->>location', 'eq', ''),
    ]);

    if (profilesRes.error) {
      console.error('Supabase Error:', profilesRes.error.message, profilesRes.error.details);
      return { success: false as const, error: profilesRes.error.message };
    }
    if (shiftsRes.error) {
      console.error('Supabase Error:', shiftsRes.error.message, shiftsRes.error.details);
      return { success: false as const, error: shiftsRes.error.message };
    }

    const weekDays = buildWeekDayIsoStrings(mondayStr);
    const weekDayNumbers = weekDayNumbersFromIsoDates(weekDays);
    const tabOverride = getConfiguredSheetTabNameOverride();

    const tabTitles = tabOverride ? [] : await listGoogleSheetTabTitles();
    const tabCandidates = tabOverride
      ? [tabOverride]
      : buildMonthlySheetTabSearchOrder(tabTitles, mondayStr, sundayStr);

    if (tabCandidates.length === 0) {
      return {
        success: false as const,
        error: `ไม่พบชีทเดือนสำหรับวันจันทร์ ${mondayStr} — ตรวจชื่อแท็บ "ตารางงานเดือน …"`,
      };
    }

    let tabName: string | null = null;
    let dateRow: number | null = null;

    for (const candidate of tabCandidates) {
      const scanRange = quoteSheetRange(
        candidate,
        `B1:H${SHEETS_WEEK_BLOCK_SCAN_MAX_ROW}`,
      );
      const branchDayRows = await readGoogleSheetValues(scanRange);
      const foundRow = findWeekBlockDateRow(branchDayRows, weekDayNumbers);
      if (foundRow) {
        tabName = candidate;
        dateRow = foundRow;
        break;
      }
    }

    if (!tabName || !dateRow) {
      return {
        success: false as const,
        error: `ไม่พบบล็อกสัปดาห์ ${weekDayNumbers.join(',')} ในชีท: ${tabCandidates.join(', ')} (คอลัมน์ B–H)`,
      };
    }

    const blockLayout = deriveWeekBlockLayout(dateRow);
    const updates = buildScheduleSheetsUpdates(
      mondayStr,
      profilesRes.data ?? [],
      shiftsRes.data ?? [],
      tabName,
      blockLayout,
    );

    await writeGoogleSheetUpdates(updates);

    return {
      success: true as const,
      weekStart: mondayStr,
      sheetTab: tabName,
      dateRow,
      cellUpdates: updates.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Google Sheets sync failed:', message);
    return { success: false as const, error: message };
  }
}
