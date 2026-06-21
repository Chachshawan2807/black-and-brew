import type { DailyReportData, DailyReportSchedule } from '@/app/actions/daily-report-actions';
import { buildDailyReportAltText } from '@/lib/line/daily-report-flex';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from '@/lib/notification-types';
import {
  deliverWebPushPayload,
  ensureVapidConfigured,
  getSupabaseAdminForPush,
  parsePushPrefs,
  type PushSubscriptionRow,
} from '@/lib/web-push';

export const DEFAULT_DAILY_REPORT_BRANCH_ID = 'main';

export interface DailyReportPushPayload {
  kind: 'daily_report';
  schedule: DailyReportSchedule;
  title: string;
  body: string;
  tag: string;
  url: string;
  locale: string;
}

export function resolveDailyReportBranchId(): string {
  return process.env.NEXT_PUBLIC_STORE_BRANCH_ID?.trim() || DEFAULT_DAILY_REPORT_BRANCH_ID;
}

function scheduleTitle(schedule: DailyReportSchedule, locale: string): string {
  const isTh = locale === 'th';
  if (schedule === 'tomorrow') {
    return isTh ? 'ตารางงานพรุ่งนี้' : "Tomorrow's schedule";
  }
  return isTh ? 'ตารางงานวันนี้' : "Today's schedule";
}

export function buildDailyReportPushPayload(
  data: DailyReportData,
  locale = 'th',
): DailyReportPushPayload {
  const alt = buildDailyReportAltText(data);
  const schedulePath = `/${locale}/schedule`;

  return {
    kind: 'daily_report',
    schedule: data.schedule,
    title: scheduleTitle(data.schedule, locale),
    body: alt.length > 220 ? `${alt.slice(0, 217)}…` : alt,
    tag: `bb-daily-report-${data.schedule}-${data.dateStr}`,
    url: schedulePath,
    locale,
  };
}

export function parseDailyReportPushPrefs(
  raw: Record<string, unknown> | null | undefined,
): NotificationPreferences & { locale: string } {
  const prefs = parsePushPrefs(raw);
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...prefs,
    dailyScheduleReports:
      typeof raw?.dailyScheduleReports === 'boolean'
        ? raw.dailyScheduleReports
        : DEFAULT_NOTIFICATION_PREFERENCES.dailyScheduleReports,
  };
}

export function shouldSendDailyReportToSubscription(
  _data: DailyReportData,
  subscription: PushSubscriptionRow,
  branchId: string = resolveDailyReportBranchId(),
): boolean {
  const prefs = parseDailyReportPushPrefs(subscription.prefs_json);
  if (!prefs.enabled || !prefs.dailyScheduleReports) {
    return false;
  }

  const subscriptionBranch = subscription.branch_id?.trim() || DEFAULT_DAILY_REPORT_BRANCH_ID;
  return subscriptionBranch === branchId;
}

export async function dispatchDailyReportWebPush(
  data: DailyReportData,
  branchId: string = resolveDailyReportBranchId(),
): Promise<{
  sent: number;
  failed: number;
  skipped: boolean;
  error?: string;
}> {
  if (!ensureVapidConfigured()) {
    return {
      sent: 0,
      failed: 0,
      skipped: true,
      error: 'vapid_not_configured',
    };
  }

  const supabase = getSupabaseAdminForPush();
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select(
      'id, user_id, endpoint, p256dh, auth, client_session_id, user_agent, prefs_json, branch_id, profile_id',
    );

  if (error) {
    if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
      return { sent: 0, failed: 0, skipped: true, error: 'push_subscriptions_table_missing' };
    }
    console.error('Supabase Error:', error.message, error.details);
    throw error;
  }

  const rows = (subscriptions ?? []) as PushSubscriptionRow[];
  if (rows.length === 0) {
    return { sent: 0, failed: 0, skipped: true, error: 'no_subscriptions' };
  }

  let sent = 0;
  let failed = 0;

  for (const subscription of rows) {
    if (!shouldSendDailyReportToSubscription(data, subscription, branchId)) continue;

    const prefs = parseDailyReportPushPrefs(subscription.prefs_json);
    const payload = buildDailyReportPushPayload(data, prefs.locale);
    const result = await deliverWebPushPayload(supabase, subscription, JSON.stringify(payload), {
      TTL: 4 * 60 * 60,
      urgency: 'high',
    });

    if (result === 'sent') sent += 1;
    else failed += 1;
  }

  if (sent === 0 && failed === 0) {
    return { sent: 0, failed: 0, skipped: true, error: 'no_eligible_subscriptions' };
  }

  return { sent, failed, skipped: false };
}
