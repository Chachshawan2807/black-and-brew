import type { Insight } from '@/lib/proactive-insights/types';
import { insightNotificationLogId } from '@/lib/insight-notification';
import { buildInventoryOsNotification } from '@/lib/pwa-notification-bridge';
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
import { buildPwaNotificationAssetPaths, type PwaNotificationAssetPaths } from '@/lib/pwa-assets';

export const DEFAULT_INSIGHT_BRANCH_ID = 'main';

export interface InsightPushPayload {
  kind: 'proactive_insight';
  ruleId: string;
  title: string;
  body: string;
  tag: string;
  url: string;
  locale: string;
  notification: InventoryNotification;
  unreadCount: number;
  assets: PwaNotificationAssetPaths;
}

export function resolveInsightBranchId(): string {
  return process.env.NEXT_PUBLIC_STORE_BRANCH_ID?.trim() || DEFAULT_INSIGHT_BRANCH_ID;
}

export function buildInsightPushPayload(
  insight: Insight,
  dateIso: string,
  locale = 'th',
): InsightPushPayload {
  const url = `/${locale}${insight.urlPath}`;
  const tag = insightNotificationLogId(insight.ruleId, dateIso);
  const detail =
    insight.summary.length > 220 ? `${insight.summary.slice(0, 217)}…` : insight.summary;
  const osNotification = buildInventoryOsNotification(insight.title, detail, 1, locale === 'th');
  const now = new Date().toISOString();

  return {
    kind: 'proactive_insight',
    ruleId: insight.ruleId,
    title: osNotification.title,
    body: osNotification.body,
    tag,
    url,
    locale,
    unreadCount: 1,
    notification: {
      id: tag,
      logId: tag,
      action: 'UPDATE',
      entityId: tag,
      entityLabel: dateIso,
      actorLabel: locale === 'th' ? 'ระบบแจ้งเตือนเชิงรุก' : 'Proactive insights',
      occurredAt: now,
      title: insight.title,
      summary: detail,
      fieldSummary: insight.summary,
      priority: insight.priority,
      read: false,
      batchedCount: 1,
      metadata: {
        kind: 'proactive_insight',
        ruleId: insight.ruleId,
        url,
        modules: insight.modules,
        module: 'insights',
      },
    },
    assets: buildPwaNotificationAssetPaths(),
  };
}

export function parseInsightPushPrefs(
  raw: Record<string, unknown> | null | undefined,
): NotificationPreferences & { locale: string } {
  const prefs = parsePushPrefs(raw);
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...prefs,
    proactiveInsights:
      typeof raw?.proactiveInsights === 'boolean'
        ? raw.proactiveInsights
        : DEFAULT_NOTIFICATION_PREFERENCES.proactiveInsights,
  };
}

export function shouldSendInsightToSubscription(
  _insight: Insight,
  subscription: PushSubscriptionRow,
  branchId: string = resolveInsightBranchId(),
): boolean {
  const prefs = parseInsightPushPrefs(subscription.prefs_json);
  if (!prefs.enabled || !prefs.proactiveInsights) {
    return false;
  }

  const subscriptionBranch = subscription.branch_id?.trim() || DEFAULT_INSIGHT_BRANCH_ID;
  return subscriptionBranch === branchId;
}

function hasInsightPrefs(subscription: PushSubscriptionRow): boolean {
  const prefs = parseInsightPushPrefs(subscription.prefs_json);
  return prefs.enabled && prefs.proactiveInsights;
}

function matchesInsightBranch(subscription: PushSubscriptionRow, branchId: string): boolean {
  const subscriptionBranch = subscription.branch_id?.trim() || DEFAULT_INSIGHT_BRANCH_ID;
  return subscriptionBranch === branchId;
}

export function selectInsightTargetSubscriptions(
  subscriptions: PushSubscriptionRow[],
  branchId: string = resolveInsightBranchId(),
): {
  targetRows: PushSubscriptionRow[];
  eligibleRows: PushSubscriptionRow[];
  branchRows: PushSubscriptionRow[];
  branchFallback: boolean;
} {
  const eligibleRows = subscriptions.filter(hasInsightPrefs);
  const branchRows = eligibleRows.filter((subscription) =>
    matchesInsightBranch(subscription, branchId),
  );
  const targetRows = branchRows.length > 0 ? branchRows : eligibleRows;

  return {
    targetRows,
    eligibleRows,
    branchRows,
    branchFallback: branchRows.length === 0 && eligibleRows.length > 0,
  };
}

export async function dispatchInsightWebPush(
  insight: Insight,
  dateIso: string,
  branchId: string = resolveInsightBranchId(),
): Promise<{
  sent: number;
  failed: number;
  removed: number;
  skipped: boolean;
  error?: string;
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
    };
  }

  const { targetRows, eligibleRows } = selectInsightTargetSubscriptions(rows, branchId);
  if (targetRows.length === 0) {
    return {
      sent: 0,
      failed: 0,
      removed: 0,
      skipped: true,
      error: eligibleRows.length === 0 ? 'no_eligible_subscriptions' : 'no_target_subscriptions',
    };
  }

  const deliveries = targetRows.map(async (subscription) => {
    const prefs = parseInsightPushPrefs(subscription.prefs_json);
    const payload = buildInsightPushPayload(insight, dateIso, prefs.locale);
    const result = await deliverWebPushPayload(supabase, subscription, JSON.stringify(payload), {
      TTL: WEB_PUSH_SCHEDULE_TTL_SECONDS,
      urgency: insight.priority === 'high' ? 'high' : 'normal',
    });
    return result.status;
  });

  const results = await Promise.all(deliveries);
  const sent = results.filter((status) => status === 'sent').length;
  const failed = results.filter((status) => status === 'failed').length;
  const removed = results.filter((status) => status === 'removed').length;

  return { sent, failed, removed, skipped: false };
}
