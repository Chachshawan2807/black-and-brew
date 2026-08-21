import {
  beanOrderCreatedNotificationLogId,
  buildBeanOrderCreatedCopy,
  buildBeanOrderCreatedOsNotification,
  recordBeanOrderCreatedNotification,
  type BeanOrderCreatedNotifyInput,
} from '@/lib/bean-orders/created-notification';
import { isIosWebPushClient } from '@/lib/pwa-assets';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type InventoryNotification,
} from '@/lib/notification-types';
import {
  deliverWebPushPayload,
  ensureVapidConfigured,
  getSupabaseAdminForPush,
  parsePushPrefs,
  WEB_PUSH_DEFAULT_TTL_SECONDS,
  type PushSubscriptionRow,
} from '@/lib/web-push';
import { buildPwaNotificationAssetPaths, type PwaNotificationAssetPaths } from '@/lib/pwa-assets';

export type { BeanOrderCreatedNotifyInput };

export interface BeanOrderCreatedPushPayload {
  kind: 'bean_order_created';
  title: string;
  body: string;
  tag: string;
  url: string;
  locale: string;
  notification: InventoryNotification;
  unreadCount: number;
  assets: PwaNotificationAssetPaths;
}

export function buildBeanOrderCreatedPushPayload(
  input: BeanOrderCreatedNotifyInput,
  locale = 'th',
): BeanOrderCreatedPushPayload {
  const { headline, customerLine, summary, fieldSummary } = buildBeanOrderCreatedCopy(
    input,
    locale,
  );
  const tag = beanOrderCreatedNotificationLogId(input.orderId);
  const url = `/${locale}/bean-orders/${input.orderId}`;
  const osNotification = buildBeanOrderCreatedOsNotification(
    headline,
    customerLine,
    summary,
    isIosWebPushClient(),
  );
  const now = new Date().toISOString();

  return {
    kind: 'bean_order_created',
    title: osNotification.title,
    body: osNotification.body,
    tag,
    url,
    locale,
    unreadCount: 1,
    assets: buildPwaNotificationAssetPaths(),
    notification: {
      id: tag,
      logId: tag,
      action: 'CREATE',
      entityId: input.orderId,
      entityLabel: input.orderNo,
      actorLabel: locale === 'th' ? 'ระบบออเดอร์เมล็ด' : 'Bean order system',
      occurredAt: now,
      title: headline,
      summary: customerLine,
      fieldSummary,
      priority: 'high',
      read: false,
      batchedCount: 1,
      metadata: {
        kind: 'bean_order_created',
        module: 'bean_orders',
        url,
        orderNo: input.orderNo,
        customerName: input.customerName,
        recipientName: input.recipientName,
        lines: input.lines,
      },
    },
  };
}

export function shouldSendBeanOrderCreatedToSubscription(
  subscription: PushSubscriptionRow,
): boolean {
  const prefs = parsePushPrefs(subscription.prefs_json);
  return (
    (prefs.enabled ?? DEFAULT_NOTIFICATION_PREFERENCES.enabled) &&
    (prefs.systemNotifications ?? DEFAULT_NOTIFICATION_PREFERENCES.systemNotifications)
  );
}

export async function dispatchBeanOrderCreatedWebPush(
  input: BeanOrderCreatedNotifyInput,
): Promise<{ sent: number; failed: number; skipped: boolean }> {
  if (!ensureVapidConfigured()) {
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
  const deliveries = rows.flatMap((subscription) => {
    if (!shouldSendBeanOrderCreatedToSubscription(subscription)) return [];
    const prefs = parsePushPrefs(subscription.prefs_json);
    const payload = buildBeanOrderCreatedPushPayload(input, prefs.locale);
    return [
      deliverWebPushPayload(supabase, subscription, JSON.stringify(payload), {
        TTL: WEB_PUSH_DEFAULT_TTL_SECONDS,
        urgency: 'high',
      }),
    ];
  });

  if (deliveries.length === 0) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const results = await Promise.all(deliveries);
  const sent = results.filter((result) => result.status === 'sent').length;
  const failed = results.length - sent;
  return { sent, failed, skipped: false };
}

/** Record in-app log + fan-out web push (idempotent per order). */
export async function notifyBeanOrderCreated(
  input: BeanOrderCreatedNotifyInput,
): Promise<{ recorded: boolean; skipped: boolean; pushSent: number }> {
  const record = await recordBeanOrderCreatedNotification(input);
  if (!record.success) {
    return { recorded: false, skipped: false, pushSent: 0 };
  }
  if (record.skipped) {
    return { recorded: true, skipped: true, pushSent: 0 };
  }

  const push = await dispatchBeanOrderCreatedWebPush(input).catch((error) => {
    console.error('[dispatchBeanOrderCreatedWebPush]', error);
    return { sent: 0, failed: 0, skipped: true };
  });

  return { recorded: true, skipped: false, pushSent: push.sent };
}
