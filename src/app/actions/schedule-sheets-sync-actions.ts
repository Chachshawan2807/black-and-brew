'use server';

/**
 * Manual Google Sheet sync for one schedule week (Mon–Sun).
 * Not called from shift mutations, realtime, or cron only from ScheduleClient button.
 */
import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import { z } from 'zod';
import { requireMutationAccess } from '@/lib/policies/server-gate';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import {
  batchReadGoogleSheetValues,
  createGoogleSheetsClient,
  getConfiguredSheetTabNameOverride,
  isGoogleSheetsSyncConfigured,
  listGoogleSheetTabTitles,
  quoteSheetRange,
  writeGoogleSheetUpdates,
} from '@/lib/google/sheets-api';
import { buildScheduleSheetsDenseUpdates } from '@/lib/schedule/sheets-week-layout';
import { buildMonthlySheetTabsForWeekSync, parseMonthlySheetTabMonthYear } from '@/lib/schedule/sheets-month-tab';
import {
  buildWeekDayIsoStrings,
  deriveWeekBlockLayout,
  findWeekBlockInSheet,
} from '@/lib/schedule/sheets-week-block';
import { SHEETS_WEEK_BLOCK_SCAN_MAX_ROW } from '@/lib/schedule/sheets-layout-config';
import { SCHEDULE_SHEETS_SYNC_POLICY } from '@/lib/schedule/sheets-sync-policy';

const weekStartSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const viewedDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function syncScheduleToGoogleSheet(
  weekStartMonday: string,
  viewedIsoDate?: string,
) {
  const authError = await requireMutationAccess();
  if (authError) {
    return { success: false as const, error: authError };
  }

  if (!isGoogleSheetsSyncConfigured()) {
    return {
      success: false as const,
      error:
        'ยังไม่ได้ตั้งค่า Google Sheets บนเซิร์ฟเวอร์ (GOOGLE_SHEETS_SPREADSHEET_ID / service account) ถ้าใช้ Preview URL ให้เพิ่ม env ใน Vercel → Preview ด้วย',
    };
  }

  const parsedWeek = weekStartSchema.safeParse(weekStartMonday);
  if (!parsedWeek.success) {
    return { success: false as const, error: 'รูปแบบวันเริ่มสัปดาห์ไม่ถูกต้อง' };
  }

  const parsedViewed = viewedIsoDate ? viewedDateSchema.safeParse(viewedIsoDate) : null;
  if (viewedIsoDate && !parsedViewed?.success) {
    return { success: false as const, error: 'รูปแบบวันที่บนหน้าเว็บไม่ถูกต้อง' };
  }

  const monday = startOfWeek(new Date(parsedWeek.data), { weekStartsOn: 1 });
  const mondayStr = format(monday, 'yyyy-MM-dd');
  const sundayStr = format(addDays(monday, 6), 'yyyy-MM-dd');

  if (!SCHEDULE_SHEETS_SYNC_POLICY.singleWeekOnly) {
    return { success: false as const, error: 'การซิงค์ Sheet ถูกจำกัดให้ทำทีละสัปดาห์เท่านั้น' };
  }

  try {
    const sheetsClient = await createGoogleSheetsClient();
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
    const viewedIso = parsedViewed?.success ? parsedViewed.data : mondayStr;
    const tabOverride = getConfiguredSheetTabNameOverride();

    const tabTitles = tabOverride ? [] : await listGoogleSheetTabTitles(sheetsClient);
    const tabCandidates = tabOverride
      ? [tabOverride]
      : buildMonthlySheetTabsForWeekSync(tabTitles, mondayStr, sundayStr, viewedIso);

    if (tabCandidates.length === 0) {
      return {
        success: false as const,
        error: `ไม่พบชีทเดือนสำหรับวันที่ ${viewedIso} ตรวจชื่อแท็บ "ตารางงานเดือน …"`,
      };
    }

    const scanRanges = tabCandidates.map((candidate) =>
      quoteSheetRange(candidate, `B1:H${SHEETS_WEEK_BLOCK_SCAN_MAX_ROW}`),
    );
    const branchDayRowsByTab = await batchReadGoogleSheetValues(scanRanges, sheetsClient);

    const profiles = profilesRes.data ?? [];
    const shifts = shiftsRes.data ?? [];

    const tabsToSync: Array<{
      tabName: string;
      dateRow: number;
      cellUpdates: number;
      updates: ReturnType<typeof buildScheduleSheetsDenseUpdates>;
    }> = [];

    for (let tabIndex = 0; tabIndex < tabCandidates.length; tabIndex += 1) {
      const candidate = tabCandidates[tabIndex];
      const parsedTabMonth = parseMonthlySheetTabMonthYear(candidate);
      const viewedDate = parseISO(viewedIso);
      const tabMonthYear = parsedTabMonth ?? {
        month: viewedDate.getMonth(),
        year: viewedDate.getFullYear(),
      };

      const match = findWeekBlockInSheet(
        branchDayRowsByTab[tabIndex] ?? [],
        weekDays,
        tabMonthYear.month,
        tabMonthYear.year,
      );
      if (!match) continue;

      const blockLayout = deriveWeekBlockLayout(
        match.dateRow,
        match.columnMap,
        match.sheetDayLabels,
      );

      const updates = buildScheduleSheetsDenseUpdates(
        mondayStr,
        profiles,
        shifts,
        candidate,
        blockLayout,
      );

      tabsToSync.push({
        tabName: candidate,
        dateRow: match.dateRow,
        cellUpdates: updates.length,
        updates,
      });
    }

    if (tabsToSync.length === 0) {
      const daySummary = weekDays
        .map((iso) => `${new Date(iso).getDate()}/${new Date(iso).getMonth() + 1}`)
        .join(', ');
      return {
        success: false as const,
        error: `ไม่พบบล็อกสัปดาห์ ${daySummary} ในชีท: ${tabCandidates.join(', ')} (คอลัมน์ B–H)`,
      };
    }

    await Promise.all(
      tabsToSync.map((tab) => writeGoogleSheetUpdates(tab.updates, sheetsClient)),
    );

    return {
      success: true as const,
      weekStart: mondayStr,
      sheetTabs: tabsToSync.map((tab) => tab.tabName),
      sheetTab: tabsToSync[0].tabName,
      dateRow: tabsToSync[0].dateRow,
      cellUpdates: tabsToSync.reduce((sum, tab) => sum + tab.cellUpdates, 0),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Google Sheets sync failed:', message);
    return { success: false as const, error: message };
  }
}
