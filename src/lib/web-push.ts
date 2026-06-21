import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import type { DataChangeLogRow } from '@/app/actions/data-change-log-actions';
import { formatInventoryNotification } from '@/lib/inventory-notification-formatter';
import { isEligibleInventoryNotification } from '@/lib/inventory-notification-filter';
import { buildOsNotificationOptions, resolvePwaSiteOrigin } from '@/lib/pwa-assets';
import { buildInventoryOsNotification } from '@/lib/pwa-notification-bridge';
import type { InventoryNotification, NotificationPreferences } from '@/lib/notification-types';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/lib/notification-types';
import { shouldNotifyForAction } from '@/lib/notification-preferences';
import type { DataChangeAction } from '@/lib/data-change-log';
import { requireServiceRoleKey } from '@/lib/security/server-auth';

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  client_session_id: string | null;
  user_agent: string | null;
  prefs_json: Record<string, unknown>;
  profile_id?: string | null;
  branch_id?: string | null;
}

export interface WebPushPayload {
  title: string;
  body: string;
  tag: string;
  url: string;
  locale: string;
  notification: InventoryNotification;
  /** Hint for SW badge when IDB is unavailable (accurate count computed on device). */
  unreadCount: number;
}

let vapidConfigured = false;

export function getSupabaseAdminForPush() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }
  return createClient(supabaseUrl, requireServiceRoleKey());
}

export type WebPushDeliveryResult =
  | { status: 'sent' }
  | { status: 'failed'; statusCode: number }
  | { status: 'removed'; statusCode: number };

const STALE_SUBSCRIPTION_STATUS_CODES = new Set([400, 403, 404, 410]);

export async function deliverWebPushPayload(
  supabase: ReturnType<typeof getSupabaseAdminForPush>,
  subscription: PushSubscriptionRow,
  payloadJson: string,
  options?: { TTL?: number; urgency?: 'very-low' | 'low' | 'normal' | 'high' },
): Promise<WebPushDeliveryResult> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      payloadJson,
      {
        TTL: options?.TTL ?? 60 * 60,
        urgency: options?.urgency ?? 'high',
      },
    );
    await supabase
      .from('push_subscriptions')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', subscription.id);
    return { status: 'sent' };
  } catch (err: unknown) {
    const statusCode =
      err && typeof err === 'object' && 'statusCode' in err
        ? Number((err as { statusCode: number }).statusCode)
        : 0;
    if (STALE_SUBSCRIPTION_STATUS_CODES.has(statusCode)) {
      await supabase.from('push_subscriptions').delete().eq('id', subscription.id);
      console.error('[web-push] removed stale subscription:', subscription.id, statusCode);
      return { status: 'removed', statusCode };
    }
    console.error('[web-push] send failed:', statusCode, err);
    return { status: 'failed', statusCode };
  }
}

export function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:admin@blackandbrew.local';

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export function parsePushPrefs(raw: Record<string, unknown> | null | undefined): NotificationPreferences & {
  locale: string;
} {
  const locale = typeof raw?.locale === 'string' ? raw.locale : 'th';
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(raw as Partial<NotificationPreferences>),
    locale,
    dailyScheduleReports:
      typeof raw?.dailyScheduleReports === 'boolean'
        ? raw.dailyScheduleReports
        : DEFAULT_NOTIFICATION_PREFERENCES.dailyScheduleReports,
  };
}

export function rowToDataChangeLogRow(row: Record<string, unknown>): DataChangeLogRow {
  return {
    id: String(row.id),
    occurred_at: String(row.occurred_at),
    actor_id: row.actor_id ? String(row.actor_id) : null,
    actor_label: String(row.actor_label),
    actor_access_level: (row.actor_access_level as DataChangeLogRow['actor_access_level']) ?? null,
    action: String(row.action),
    module: String(row.module),
    entity_type: String(row.entity_type),
    entity_id: row.entity_id ? String(row.entity_id) : null,
    entity_label: row.entity_label ? String(row.entity_label) : null,
    field_changes: (row.field_changes as DataChangeLogRow['field_changes']) ?? [],
    old_value: row.old_value as DataChangeLogRow['old_value'],
    new_value: row.new_value as DataChangeLogRow['new_value'],
    source: String(row.source),
    ip_address: row.ip_address ? String(row.ip_address) : null,
    user_agent: row.user_agent ? String(row.user_agent) : null,
    status: String(row.status),
    error_message: row.error_message ? String(row.error_message) : null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

export function buildWebPushPayload(row: DataChangeLogRow, locale = 'th'): WebPushPayload | null {
  if (!isEligibleInventoryNotification(row)) return null;

  const notification = formatInventoryNotification(row, locale);
  const isTh = locale === 'th';
  const inventoryPath = `/${locale}/inventory`;
  const formatted = buildInventoryOsNotification(notification.title, notification.summary, 1, isTh);

  return {
    title: formatted.title,
    body: formatted.body,
    tag: notification.logId,
    url: notification.entityId
      ? `${inventoryPath}?highlight=${notification.entityId}`
      : inventoryPath,
    locale,
    notification,
    unreadCount: 1,
  };
}

export function shouldSendPushToSubscription(
  row: DataChangeLogRow,
  subscription: PushSubscriptionRow
): boolean {
  const prefs = parsePushPrefs(subscription.prefs_json);
  if (!prefs.enabled || !prefs.systemNotifications) return false;
  if (!shouldNotifyForAction(prefs, row.action as DataChangeAction)) return false;

  const originSessionId =
    typeof row.metadata?.clientSessionId === 'string' ? row.metadata.clientSessionId : '';
  if (!prefs.notifyOwnChanges && originSessionId && subscription.client_session_id === originSessionId) {
    return false;
  }

  return true;
}

export async function dispatchInventoryWebPush(row: DataChangeLogRow): Promise<{
  sent: number;
  failed: number;
  skipped: boolean;
}> {
  if (!ensureVapidConfigured()) {
    return { sent: 0, failed: 0, skipped: true };
  }

  if (!isEligibleInventoryNotification(row)) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const supabase = getSupabaseAdminForPush();
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select(
      'id, user_id, endpoint, p256dh, auth, client_session_id, user_agent, prefs_json, branch_id, profile_id',
    );

  if (error) {
    if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
      return { sent: 0, failed: 0, skipped: true };
    }
    console.error('Supabase Error:', error.message, error.details);
    throw error;
  }

  const rows = (subscriptions ?? []) as PushSubscriptionRow[];
  if (rows.length === 0) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const deliveries = rows.flatMap((subscription) => {
    if (!shouldSendPushToSubscription(row, subscription)) return [];

    const prefs = parsePushPrefs(subscription.prefs_json);
    const payload = buildWebPushPayload(row, prefs.locale);
    if (!payload) return [];

    return [deliverWebPushPayload(supabase, subscription, JSON.stringify(payload))];
  });

  const results = await Promise.all(deliveries);
  const sent = results.filter((result) => result.status === 'sent').length;
  const failed = results.length - sent;

  return { sent, failed, skipped: false };
}

export function buildPushNotificationOptions(payload: WebPushPayload) {
  return buildOsNotificationOptions({
    body: payload.body,
    tag: payload.tag,
    url: payload.url,
    enableVibrate: true,
    origin: resolvePwaSiteOrigin() || undefined,
  });
}
