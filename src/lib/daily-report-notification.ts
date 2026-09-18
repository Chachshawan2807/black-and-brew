import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { formatInTimeZone } from 'date-fns-tz';
import { THAI_TIMEZONE } from '@/lib/timezone';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import type { DailyReportData, DailyReportSchedule } from '@/lib/daily-report/types';
import {
  buildDailyReportAltText,
  buildDailyReportFieldSummary,
  buildDailyReportSummaryLine,
} from '@/lib/daily-report-summary';
import { bangkokCalendarIsoToDate, getBangkokCalendarIso, addBangkokCalendarDays } from '@/lib/date-utils';
import { formatScheduleNotificationDateDisplay, THAI_DISPLAY_DATE_FORMAT } from '@/lib/date-utils';
import { sanitizeJsonValue } from '@/lib/data-change-log';

export function dailyReportNotificationLogId(
  schedule: DailyReportSchedule,
  dateStr: string,
): string {
  return `bb-daily-report-${schedule}-${dateStr}`;
}

/** Marks when the scheduled cron Web Push was delivered (prevents duplicate OS banners). */
export const DAILY_REPORT_WEB_PUSH_DISPATCHED_KEY = 'webPushDispatchedAt';

function scheduleTitle(schedule: DailyReportSchedule, locale: string): string {
  const isTh = locale === 'th';
  if (schedule === 'tomorrow') {
    return isTh ? 'ตารางงานพรุ่งนี้' : "Tomorrow's schedule";
  }
  return isTh ? 'ตารางงานวันนี้' : "Today's schedule";
}

function buildDailyReportLogPayload(data: DailyReportData, locale: string) {
  const logId = dailyReportNotificationLogId(data.schedule, data.dateStr);
  const fieldSummary = buildDailyReportFieldSummary(data);
  const alt = buildDailyReportAltText(data);
  const schedulePath = `/${locale}/schedule`;
  const title = scheduleTitle(data.schedule, locale);
  const summaryLine = buildDailyReportSummaryLine(data);
  const summary = summaryLine.length > 220 ? `${summaryLine.slice(0, 217)}…` : summaryLine;
  const isTh = locale === 'th';

  return {
    logId,
    alt,
    schedulePath,
    title,
    summary,
    fieldSummary,
    isTh,
  };
}

function buildDailyReportMetadata(
  data: DailyReportData,
  locale: string,
  previousMetadata?: Record<string, unknown> | null,
) {
  const { logId, alt, schedulePath, title, summary, fieldSummary, isTh } =
    buildDailyReportLogPayload(data, locale);

  return {
    ...(previousMetadata ?? {}),
    kind: 'daily_report',
    schedule: data.schedule,
    url: schedulePath,
    notificationLogId: logId,
    title,
    summary,
    fieldSummary,
    locale,
  };
}

async function findDailyReportLogRow(
  supabase: SupabaseClient,
  logId: string,
): Promise<{ row: { id: string; metadata?: Record<string, unknown> | null } | null; tableMissing: boolean }> {
  const { data: existing, error: lookupError } = await supabase
    .from('data_change_logs')
    .select('id, metadata')
    .eq('module', 'schedule')
    .eq('entity_type', 'daily_report')
    .eq('entity_id', logId)
    .limit(1);

  if (lookupError) {
    if (lookupError.code === 'PGRST205' || lookupError.message?.includes('Could not find the table')) {
      return { row: null, tableMissing: true };
    }
    console.error('Supabase Error:', lookupError.message, lookupError.details);
    throw lookupError;
  }

  return { row: existing?.[0] ?? null, tableMissing: false };
}

export function isDailyReportWebPushDispatched(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  return typeof metadata?.[DAILY_REPORT_WEB_PUSH_DISPATCHED_KEY] === 'string';
}

/** True when the 05:00 / 18:00 cron already delivered Web Push for this schedule day. */
export async function wasDailyReportWebPushDispatched(logId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  try {
    const { row, tableMissing } = await findDailyReportLogRow(supabase, logId);
    if (tableMissing || !row) return false;
    const metadata =
      typeof row.metadata === 'object' && row.metadata !== null
        ? (row.metadata as Record<string, unknown>)
        : undefined;
    return isDailyReportWebPushDispatched(metadata);
  } catch (error) {
    console.error('[wasDailyReportWebPushDispatched] Exception:', error);
    return false;
  }
}

/** Record successful Web Push delivery so duplicate cron hits skip re-send. */
export async function markDailyReportWebPushDispatched(logId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    const { row, tableMissing } = await findDailyReportLogRow(supabase, logId);
    if (tableMissing || !row) return;

    const metadata = {
      ...(typeof row.metadata === 'object' && row.metadata !== null
        ? (row.metadata as Record<string, unknown>)
        : {}),
      [DAILY_REPORT_WEB_PUSH_DISPATCHED_KEY]: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('data_change_logs')
      .update({ metadata })
      .eq('id', row.id);

    if (error) {
      console.error('Supabase Error:', error.message, error.details);
      throw error;
    }
  } catch (error) {
    console.error('[markDailyReportWebPushDispatched] Exception:', error);
  }
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAdminKey) return null;
  return createClient(supabaseUrl, supabaseAdminKey, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
  });
}

/** Insert or refresh a daily schedule report log (cron + roster sync share this path). */
export async function syncDailyReportNotificationLog(
  data: DailyReportData,
  locale = 'th',
): Promise<{ success: boolean; created: boolean; updated: boolean }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { success: false, created: false, updated: false };

  const { logId, isTh } = buildDailyReportLogPayload(data, locale);

  try {
    const { row: existing, tableMissing } = await findDailyReportLogRow(supabase, logId);
    if (tableMissing) return { success: false, created: false, updated: false };

    if (existing) {
      const updated = await updateDailyReportNotificationLog(data, locale);
      return { success: updated.success, created: false, updated: updated.updated };
    }

    const metadata = buildDailyReportMetadata(data, locale);

    const { error } = await supabase.from('data_change_logs').insert({
      occurred_at: new Date().toISOString(),
      actor_id: null,
      actor_label: isTh ? 'ระบบตารางงาน' : 'Schedule system',
      actor_access_level: 'system',
      action: 'UPDATE',
      module: 'schedule',
      entity_type: 'daily_report',
      entity_id: logId,
      entity_label: formatScheduleNotificationDateDisplay(data.dateStr),
      field_changes: [],
      old_value: null,
      new_value: sanitizeJsonValue(data),
      source: 'system',
      status: 'success',
      metadata,
    });

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        return { success: false, created: false, updated: false };
      }
      console.error('Supabase Error:', error.message, error.details);
      throw error;
    }

    return { success: true, created: true, updated: false };
  } catch (error) {
    console.error('[syncDailyReportNotificationLog] Exception:', error);
    return { success: false, created: false, updated: false };
  }
}

/**
 * Persist a daily schedule report so the in-app notification panel can catch up.
 * Cron retries upsert fresh roster data instead of leaving a stale zero-headcount log.
 */
export async function recordDailyReportNotificationLog(
  data: DailyReportData,
  locale = 'th',
): Promise<{ success: boolean; skipped?: boolean }> {
  const result = await syncDailyReportNotificationLog(data, locale);
  if (!result.success) return { success: false };
  return { success: true, skipped: result.updated && !result.created };
}

/** Refresh an existing cron daily report log after roster edits (no new notification row). */
export async function updateDailyReportNotificationLog(
  data: DailyReportData,
  locale = 'th',
): Promise<{ success: boolean; updated: boolean }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { success: false, updated: false };

  const { logId } = buildDailyReportLogPayload(data, locale);

  try {
    const { row: existing, tableMissing } = await findDailyReportLogRow(supabase, logId);
    if (tableMissing) return { success: false, updated: false };
    if (!existing) return { success: true, updated: false };

    const previousMetadata =
      typeof existing.metadata === 'object' && existing.metadata !== null
        ? (existing.metadata as Record<string, unknown>)
        : undefined;

    const { error } = await supabase
      .from('data_change_logs')
      .update({
        // Keep original cron occurred_at roster edits must not re-trigger notifications.
        new_value: sanitizeJsonValue(data),
        metadata: buildDailyReportMetadata(data, locale, previousMetadata),
      })
      .eq('id', existing.id);

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        return { success: false, updated: false };
      }
      console.error('Supabase Error:', error.message, error.details);
      throw error;
    }

    return { success: true, updated: true };
  } catch (error) {
    console.error('[updateDailyReportNotificationLog] Exception:', error);
    return { success: false, updated: false };
  }
}

/** Re-sync daily report notification logs for a calendar day after shift mutations. */
export async function refreshDailyReportNotificationsForDate(
  targetDate: Date,
  locale = 'th',
): Promise<void> {
  const dateStr = formatInTimeZone(targetDate, THAI_TIMEZONE, THAI_DISPLAY_DATE_FORMAT);
  const targetIso = formatInTimeZone(targetDate, THAI_TIMEZONE, 'yyyy-MM-dd');
  const bangkokTodayIso = getBangkokCalendarIso();
  const bangkokTomorrowIso = addBangkokCalendarDays(bangkokTodayIso, 1);
  const schedules: DailyReportSchedule[] = ['today', 'tomorrow'];
  const { compileDailyReportDataForDate } = await import('@/lib/daily-report/queries');
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  await Promise.all(
    schedules.map(async (schedule) => {
      const logId = dailyReportNotificationLogId(schedule, dateStr);
      const { row: existing } = await findDailyReportLogRow(supabase, logId);
      const shouldForceSync =
        (schedule === 'today' && targetIso === bangkokTodayIso) ||
        (schedule === 'tomorrow' && targetIso === bangkokTomorrowIso);
      if (!existing && !shouldForceSync) return;

      const data = await compileDailyReportDataForDate(targetDate, schedule);
      await syncDailyReportNotificationLog(data, locale);
    }),
  );
}

export {
  formatDailyReportNotification,
  isEligibleDailyReportNotification,
} from '@/lib/daily-report-notification-format';
