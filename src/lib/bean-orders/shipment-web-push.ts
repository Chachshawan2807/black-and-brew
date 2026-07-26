import {
  beanOrderShippedNotificationLogId,
  buildBeanOrderShippedCopy,
  recordBeanOrderShippedNotification,
  type BeanOrderShippedNotifyInput,
} from '@/lib/bean-orders/shipment-notification';
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

export type { BeanOrderShippedNotifyInput };

export interface BeanOrderShippedPushPayload {
  kind: 'bean_order_shipped';
  title: string;
  body: string;
  tag: string;
  url: string;
  locale: string;
  notification: InventoryNotification;
  unreadCount: number;
  assets: PwaNotificationAssetPaths;
}

export function buildBeanOrderShippedPushPayload(
  input: BeanOrderShippedNotifyInput,
  locale = 'th',
): BeanOrderShippedPushPayload {
  const { title, summary, fieldSummary } = buildBeanOrderShippedCopy(input, locale);
  const tag = beanOrderShippedNotificationLogId(input.orderId);
  const url = `/${locale}/bean-orders/${input.orderId}`;
  const now = new Date().toISOString();

  return {
    kind: 'bean_order_shipped',
    title,
    body: summary,
    tag,
    url,
    locale,
    unreadCount: 1,
    assets: buildPwaNotificationAssetPaths(),
    notification: {
      id: tag,
      logId: tag,
      action: 'UPDATE',
      entityId: input.orderId,
      entityLabel: input.orderNo,
      actorLabel: locale === 'th' ? 'ระบบจัดส่ง' : 'Shipping system',
      occurredAt: now,
      title,
      summary,
      fieldSummary,
      priority: 'high',
      read: false,
      batchedCount: 1,
      metadata: {
        kind: 'bean_order_shipped',
        module: 'bean_orders',
        url,
        trackingNumber: input.trackingNumber,
        orderNo: input.orderNo,
        customerName: input.customerName,
        carrierCode: input.carrierCode ?? null,
      },
    },
  };
}

export function shouldSendBeanOrderShippedToSubscription(
  subscription: PushSubscriptionRow,
): boolean {
  const prefs = parsePushPrefs(subscription.prefs_json);
  return (
    (prefs.enabled ?? DEFAULT_NOTIFICATION_PREFERENCES.enabled) &&
    (prefs.systemNotifications ?? DEFAULT_NOTIFICATION_PREFERENCES.systemNotifications)
  );
}

export async function dispatchBeanOrderShippedWebPush(
  input: BeanOrderShippedNotifyInput,
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
    if (!shouldSendBeanOrderShippedToSubscription(subscription)) return [];
    const prefs = parsePushPrefs(subscription.prefs_json);
    const payload = buildBeanOrderShippedPushPayload(input, prefs.locale);
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
export async function notifyBeanOrderShipped(
  input: BeanOrderShippedNotifyInput,
): Promise<{ recorded: boolean; skipped: boolean; pushSent: number }> {
  const record = await recordBeanOrderShippedNotification(input);
  if (!record.success) {
    return { recorded: false, skipped: false, pushSent: 0 };
  }
  if (record.skipped) {
    return { recorded: true, skipped: true, pushSent: 0 };
  }

  const push = await dispatchBeanOrderShippedWebPush(input).catch((error) => {
    console.error('[dispatchBeanOrderShippedWebPush]', error);
    return { sent: 0, failed: 0, skipped: true };
  });

  return { recorded: true, skipped: false, pushSent: push.sent };
}
