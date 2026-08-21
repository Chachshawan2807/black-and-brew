import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import type { DailyReportData, DailyReportSchedule } from '@/app/actions/daily-report-actions';
import { buildDailyReportAltText } from '@/lib/daily-report-summary';
import { formatScheduleNotificationDateDisplay } from '@/lib/date-utils';
import { sanitizeJsonValue } from '@/lib/data-change-log';
import type { InventoryNotification } from '@/lib/notification-types';

export function dailyReportNotificationLogId(
  schedule: DailyReportSchedule,
  dateStr: string,
): string {
  return `bb-daily-report-${schedule}-${dateStr}`;
}

function scheduleTitle(schedule: DailyReportSchedule, locale: string): string {
  const isTh = locale === 'th';
  if (schedule === 'tomorrow') {
    return isTh ? 'ตารางงานพรุ่งนี้' : "Tomorrow's schedule";
  }
  return isTh ? 'ตารางงานวันนี้' : "Today's schedule";
}

function buildDailyReportLogPayload(data: DailyReportData, locale: string) {
  const logId = dailyReportNotificationLogId(data.schedule, data.dateStr);
  const alt = buildDailyReportAltText(data);
  const schedulePath = `/${locale}/schedule`;
  const title = scheduleTitle(data.schedule, locale);
  const summary = alt.length > 220 ? `${alt.slice(0, 217)}…` : alt;
  const isTh = locale === 'th';

  return {
    logId,
    alt,
    schedulePath,
    title,
    summary,
    isTh,
  };
}

async function findDailyReportLogRow(
  supabase: SupabaseClient,
  logId: string,
) {
  const { data: existing, error: lookupError } = await supabase
    .from('data_change_logs')
    .select('id')
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

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAdminKey) return null;
  return createClient(supabaseUrl, supabaseAdminKey, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
  });
}

/** Persist a daily schedule report so the in-app notification panel can catch up and show history. */
export async function recordDailyReportNotificationLog(
  data: DailyReportData,
  locale = 'th',
): Promise<{ success: boolean; skipped?: boolean }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { success: false };

  const { logId, alt, schedulePath, title, summary, isTh } = buildDailyReportLogPayload(data, locale);

  try {
    const { row: existing, tableMissing } = await findDailyReportLogRow(supabase, logId);
    if (tableMissing) return { success: false };
    if (existing) return { success: true, skipped: true };

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
      metadata: {
        kind: 'daily_report',
        schedule: data.schedule,
        url: schedulePath,
        notificationLogId: logId,
        title,
        summary,
        fieldSummary: alt,
        locale,
      },
    });

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        return { success: false };
      }
      console.error('Supabase Error:', error.message, error.details);
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('[recordDailyReportNotificationLog] Exception:', error);
    return { success: false };
  }
}

/** Refresh an existing cron daily report log after roster edits (no new notification row). */
export async function updateDailyReportNotificationLog(
  data: DailyReportData,
  locale = 'th',
): Promise<{ success: boolean; updated: boolean }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { success: false, updated: false };

  const { logId, alt, schedulePath, title, summary, isTh } = buildDailyReportLogPayload(data, locale);

  try {
    const { row: existing, tableMissing } = await findDailyReportLogRow(supabase, logId);
    if (tableMissing) return { success: false, updated: false };
    if (!existing) return { success: true, updated: false };

    const { error } = await supabase
      .from('data_change_logs')
      .update({
        // Keep original cron occurred_at — roster edits must not re-trigger notifications.
        new_value: sanitizeJsonValue(data),
        metadata: {
          kind: 'daily_report',
          schedule: data.schedule,
          url: schedulePath,
          notificationLogId: logId,
          title,
          summary,
          fieldSummary: alt,
          locale,
        },
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
  const dateStr = format(targetDate, 'dd-MM-yyyy');
  const schedules: DailyReportSchedule[] = ['today', 'tomorrow'];
  const { compileDailyReportDataForDate } = await import('@/app/actions/daily-report-actions');

  await Promise.all(
    schedules.map(async (schedule) => {
      const logId = dailyReportNotificationLogId(schedule, dateStr);
      const supabase = getSupabaseAdmin();
      if (!supabase) return;

      const { row: existing } = await findDailyReportLogRow(supabase, logId);
      if (!existing) return;

      const data = await compileDailyReportDataForDate(targetDate, schedule);
      await updateDailyReportNotificationLog(data, locale);
    }),
  );
}

export function isEligibleDailyReportNotification(row: DataChangeLogRow): boolean {
  if (row.module !== 'schedule' || row.status !== 'success') return false;
  if (row.entity_type !== 'daily_report') return false;
  const meta = row.metadata ?? {};
  return meta.kind === 'daily_report';
}

export function formatDailyReportNotification(
  row: DataChangeLogRow,
  locale: string,
): InventoryNotification {
  const meta = row.metadata ?? {};
  const isTh = locale === 'th';
  const logId =
    typeof meta.notificationLogId === 'string'
      ? meta.notificationLogId
      : row.entity_id ?? row.id;
  const title =
    typeof meta.title === 'string'
      ? meta.title
      : isTh
        ? 'ตารางงาน'
        : 'Schedule';
  const fieldSummary =
    typeof meta.fieldSummary === 'string'
      ? meta.fieldSummary
      : typeof meta.summary === 'string'
        ? meta.summary
        : '';
  const summary =
    typeof meta.summary === 'string'
      ? meta.summary
      : fieldSummary.split('\n').filter(Boolean)[0] ?? '';

  return {
    id: logId,
    logId,
    action: 'UPDATE',
    entityId: row.entity_id,
    entityLabel: row.entity_label,
    actorLabel: row.actor_label,
    occurredAt: row.occurred_at,
    title,
    summary,
    fieldSummary,
    priority: 'normal',
    read: false,
    batchedCount: 1,
    metadata: {
      ...meta,
      kind: 'daily_report',
      module: 'schedule',
    },
  };
}
