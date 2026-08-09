import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type InventoryNotification,
  type NotificationPreferences,
} from '@/lib/notification-types';
import { formatSecurityNotification, isEligibleSecurityNotification } from '@/lib/security-notification';
import { buildInventoryOsNotification } from '@/lib/pwa-notification-bridge';
import {
  deliverWebPushPayload,
  ensureVapidConfigured,
  getSupabaseAdminForPush,
  parsePushPrefs,
  WEB_PUSH_DEFAULT_TTL_SECONDS,
  type PushSubscriptionRow,
} from '@/lib/web-push';
import { buildPwaNotificationAssetPaths, type PwaNotificationAssetPaths } from '@/lib/pwa-assets';

export interface SecurityPushPayload {
  kind: 'security_alert';
  alertKind: string;
  title: string;
  body: string;
  tag: string;
  url: string;
  locale: string;
  notification: InventoryNotification;
  unreadCount: number;
  assets: PwaNotificationAssetPaths;
}

export function parseSecurityPushPrefs(
  raw: Record<string, unknown> | null | undefined,
): NotificationPreferences & { locale: string } {
  const prefs = parsePushPrefs(raw);
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...prefs,
    securityAlerts:
      typeof raw?.securityAlerts === 'boolean'
        ? raw.securityAlerts
        : DEFAULT_NOTIFICATION_PREFERENCES.securityAlerts,
  };
}

export function shouldSendSecurityToSubscription(subscription: PushSubscriptionRow): boolean {
  const prefs = parseSecurityPushPrefs(subscription.prefs_json);
  return prefs.enabled && prefs.securityAlerts;
}

export function buildSecurityPushPayload(
  row: DataChangeLogRow,
  locale = 'th',
): SecurityPushPayload | null {
  if (!isEligibleSecurityNotification(row)) return null;

  const notification = formatSecurityNotification(row, locale);
  const detail =
    notification.summary.length > 220
      ? `${notification.summary.slice(0, 217)}…`
      : notification.summary;
  const osNotification = buildInventoryOsNotification(
    notification.title,
    detail,
    1,
    locale === 'th',
    { fieldSummary: notification.fieldSummary },
  );
  const url =
    typeof notification.metadata.url === 'string'
      ? notification.metadata.url
      : `/${locale}/settings`;

  return {
    kind: 'security_alert',
    alertKind: String(notification.metadata.kind ?? 'security'),
    title: osNotification.title,
    body: osNotification.body,
    tag: notification.logId,
    url,
    locale,
    notification,
    unreadCount: 1,
    assets: buildPwaNotificationAssetPaths(),
  };
}

export async function dispatchSecurityWebPush(row: DataChangeLogRow): Promise<{
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

  if (!isEligibleSecurityNotification(row)) {
    return {
      sent: 0,
      failed: 0,
      removed: 0,
      skipped: true,
      error: 'ineligible_row',
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
  const targetRows = rows.filter(shouldSendSecurityToSubscription);

  if (targetRows.length === 0) {
    return {
      sent: 0,
      failed: 0,
      removed: 0,
      skipped: true,
      error: rows.length === 0 ? 'no_subscriptions' : 'no_eligible_subscriptions',
    };
  }

  const deliveries = targetRows.map(async (subscription) => {
    const prefs = parseSecurityPushPrefs(subscription.prefs_json);
    const payload = buildSecurityPushPayload(row, prefs.locale);
    if (!payload) return 'skipped' as const;

    const result = await deliverWebPushPayload(supabase, subscription, JSON.stringify(payload), {
      TTL: WEB_PUSH_DEFAULT_TTL_SECONDS,
      urgency: 'high',
    });
    return result.status;
  });

  const results = await Promise.all(deliveries);
  const sent = results.filter((status) => status === 'sent').length;
  const failed = results.filter((status) => status === 'failed').length;
  const removed = results.filter((status) => status === 'removed').length;

  return { sent, failed, removed, skipped: false };
}
