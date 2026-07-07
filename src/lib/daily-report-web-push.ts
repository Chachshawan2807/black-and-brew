import type { DailyReportData, DailyReportSchedule } from '@/app/actions/daily-report-actions';
import { buildDailyReportAltText } from '@/lib/daily-report-summary';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type InventoryNotification,
  type NotificationPreferences,
} from '@/lib/notification-types';
import {
  deliverWebPushPayload,
  ensureVapidConfigured,
  getSupabaseAdminForPush,
  parsePushPrefs,
  WEB_PUSH_SCHEDULE_TTL_SECONDS,
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
  notification: InventoryNotification;
  unreadCount: number;
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
  const tag = `bb-daily-report-${data.schedule}-${data.dateStr}`;
  const title = scheduleTitle(data.schedule, locale);
  const body = alt.length > 220 ? `${alt.slice(0, 217)}…` : alt;
  const now = new Date().toISOString();

  return {
    kind: 'daily_report',
    schedule: data.schedule,
    title,
    body,
    tag,
    url: schedulePath,
    locale,
    unreadCount: 1,
    notification: {
      id: tag,
      logId: tag,
      action: 'UPDATE',
      entityId: null,
      entityLabel: data.dateStr,
      actorLabel: locale === 'th' ? 'ระบบตารางงาน' : 'Schedule system',
      occurredAt: now,
      title,
      summary: body,
      fieldSummary: alt,
      priority: 'normal',
      read: false,
      batchedCount: 1,
      metadata: {
        kind: 'daily_report',
        schedule: data.schedule,
        url: schedulePath,
      },
    },
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

function hasDailyReportPrefs(subscription: PushSubscriptionRow): boolean {
  const prefs = parseDailyReportPushPrefs(subscription.prefs_json);
  return prefs.enabled && prefs.dailyScheduleReports;
}

function matchesDailyReportBranch(
  subscription: PushSubscriptionRow,
  branchId: string,
): boolean {
  const subscriptionBranch = subscription.branch_id?.trim() || DEFAULT_DAILY_REPORT_BRANCH_ID;
  return subscriptionBranch === branchId;
}

export function selectDailyReportTargetSubscriptions(
  subscriptions: PushSubscriptionRow[],
  branchId: string = resolveDailyReportBranchId(),
): {
  targetRows: PushSubscriptionRow[];
  eligibleRows: PushSubscriptionRow[];
  branchRows: PushSubscriptionRow[];
  branchFallback: boolean;
} {
  const eligibleRows = subscriptions.filter(hasDailyReportPrefs);
  const branchRows = eligibleRows.filter((subscription) =>
    matchesDailyReportBranch(subscription, branchId),
  );
  const targetRows = branchRows.length > 0 ? branchRows : eligibleRows;

  return {
    targetRows,
    eligibleRows,
    branchRows,
    branchFallback: branchRows.length === 0 && eligibleRows.length > 0,
  };
}

function getSubscriptionDeviceKind(subscription: PushSubscriptionRow): 'mobile' | 'desktop' {
  const userAgent = subscription.user_agent?.toLowerCase() ?? '';
  return /iphone|ipad|android|mobile/.test(userAgent) ? 'mobile' : 'desktop';
}

function incrementCount(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}

export async function dispatchDailyReportWebPush(
  data: DailyReportData,
  branchId: string = resolveDailyReportBranchId(),
): Promise<{
  sent: number;
  failed: number;
  removed: number;
  skipped: boolean;
  error?: string;
  totalSubscriptions?: number;
  eligibleSubscriptions?: number;
  branchMatchedSubscriptions?: number;
  branchFallback?: boolean;
  failureStatusCounts?: Record<string, number>;
  targetDeviceCounts?: Record<string, number>;
  sentDeviceCounts?: Record<string, number>;
  failedDeviceCounts?: Record<string, number>;
  removedDeviceCounts?: Record<string, number>;
}> {
  if (!ensureVapidConfigured()) {
    return {
      sent: 0,
      failed: 0,
      removed: 0,
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
      return {
        sent: 0,
        failed: 0,
        removed: 0,
        skipped: true,
        error: 'push_subscriptions_table_missing',
      };
    }
    console.error('Supabase Error:', error.message, error.details);
    throw error;
  }

  const rows = (subscriptions ?? []) as PushSubscriptionRow[];
  if (rows.length === 0) {
    return {
      sent: 0,
      failed: 0,
      removed: 0,
      skipped: true,
      error: 'no_subscriptions',
      totalSubscriptions: 0,
      eligibleSubscriptions: 0,
      branchMatchedSubscriptions: 0,
    };
  }

  // Single-store safety: do not drop every recipient because a production
  // branch env var drifted from existing subscription rows.
  const { targetRows, eligibleRows, branchRows, branchFallback } =
    selectDailyReportTargetSubscriptions(rows, branchId);

  let sent = 0;
  let failed = 0;
  let removed = 0;
  const failureStatusCounts: Record<string, number> = {};
  const targetDeviceCounts: Record<string, number> = {};
  const sentDeviceCounts: Record<string, number> = {};
  const failedDeviceCounts: Record<string, number> = {};
  const removedDeviceCounts: Record<string, number> = {};

  const deliveries = targetRows.map(async (subscription) => {
    const deviceKind = getSubscriptionDeviceKind(subscription);
    incrementCount(targetDeviceCounts, deviceKind);
    const prefs = parseDailyReportPushPrefs(subscription.prefs_json);
    const payload = buildDailyReportPushPayload(data, prefs.locale);
    const result = await deliverWebPushPayload(supabase, subscription, JSON.stringify(payload), {
      TTL: WEB_PUSH_SCHEDULE_TTL_SECONDS,
      urgency: 'high',
    });

    if (result.status === 'sent') {
      incrementCount(sentDeviceCounts, deviceKind);
    } else if (result.status === 'removed') {
      incrementCount(removedDeviceCounts, deviceKind);
      const key = String(result.statusCode);
      failureStatusCounts[key] = (failureStatusCounts[key] ?? 0) + 1;
    } else {
      incrementCount(failedDeviceCounts, deviceKind);
      const key = String(result.statusCode);
      failureStatusCounts[key] = (failureStatusCounts[key] ?? 0) + 1;
    }
    return result.status;
  });

  const results = await Promise.all(deliveries);
  sent = results.filter((status) => status === 'sent').length;
  failed = results.filter((status) => status === 'failed').length;
  removed = results.filter((status) => status === 'removed').length;

  if (sent === 0 && failed === 0 && removed === 0) {
    return {
      sent: 0,
      failed: 0,
      removed: 0,
      skipped: true,
      error: 'no_eligible_subscriptions',
      totalSubscriptions: rows.length,
      eligibleSubscriptions: eligibleRows.length,
      branchMatchedSubscriptions: branchRows.length,
      branchFallback,
      failureStatusCounts,
      targetDeviceCounts,
      sentDeviceCounts,
      failedDeviceCounts,
      removedDeviceCounts,
    };
  }

  return {
    sent,
    failed,
    removed,
    skipped: false,
    totalSubscriptions: rows.length,
    eligibleSubscriptions: eligibleRows.length,
    branchMatchedSubscriptions: branchRows.length,
    branchFallback,
    failureStatusCounts,
    targetDeviceCounts,
    sentDeviceCounts,
    failedDeviceCounts,
    removedDeviceCounts,
  };
}
