import {
  beanOrderPaymentNotificationLogId,
  buildBeanOrderPaymentCopy,
  recordBeanOrderPaymentNotification,
  type BeanOrderPaymentNotifyInput,
} from '@/lib/bean-orders/payment-notification';
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

export type { BeanOrderPaymentNotifyInput };

export interface BeanOrderPaymentPushPayload {
  kind: 'bean_order_payment_confirmed';
  title: string;
  body: string;
  tag: string;
  url: string;
  locale: string;
  notification: InventoryNotification;
  unreadCount: number;
  assets: PwaNotificationAssetPaths;
}

export function buildBeanOrderPaymentPushPayload(
  input: BeanOrderPaymentNotifyInput,
  locale = 'th',
): BeanOrderPaymentPushPayload {
  const { title, summary, fieldSummary } = buildBeanOrderPaymentCopy(input, locale);
  const tag = beanOrderPaymentNotificationLogId(input.orderId);
  const url = `/${locale}/bean-orders/${input.orderId}`;
  const now = new Date().toISOString();

  return {
    kind: 'bean_order_payment_confirmed',
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
      actorLabel: locale === 'th' ? 'ระบบชำระเงิน' : 'Payment system',
      occurredAt: now,
      title,
      summary,
      fieldSummary,
      priority: 'high',
      read: false,
      batchedCount: 1,
      metadata: {
        kind: 'bean_order_payment_confirmed',
        module: 'bean_orders',
        url,
        orderNo: input.orderNo,
        customerName: input.customerName,
        totalBaht: input.totalBaht ?? null,
      },
    },
  };
}

export function shouldSendBeanOrderPaymentToSubscription(
  subscription: PushSubscriptionRow,
): boolean {
  const prefs = parsePushPrefs(subscription.prefs_json);
  return (
    (prefs.enabled ?? DEFAULT_NOTIFICATION_PREFERENCES.enabled) &&
    (prefs.systemNotifications ?? DEFAULT_NOTIFICATION_PREFERENCES.systemNotifications)
  );
}

export async function dispatchBeanOrderPaymentWebPush(
  input: BeanOrderPaymentNotifyInput,
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
    if (!shouldSendBeanOrderPaymentToSubscription(subscription)) return [];
    const prefs = parsePushPrefs(subscription.prefs_json);
    const payload = buildBeanOrderPaymentPushPayload(input, prefs.locale);
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
export async function notifyBeanOrderPaymentConfirmed(
  input: BeanOrderPaymentNotifyInput,
): Promise<{ recorded: boolean; skipped: boolean; pushSent: number }> {
  const record = await recordBeanOrderPaymentNotification(input);
  if (!record.success) {
    return { recorded: false, skipped: false, pushSent: 0 };
  }
  if (record.skipped) {
    return { recorded: true, skipped: true, pushSent: 0 };
  }

  const push = await dispatchBeanOrderPaymentWebPush(input).catch((error) => {
    console.error('[dispatchBeanOrderPaymentWebPush]', error);
    return { sent: 0, failed: 0, skipped: true };
  });

  return { recorded: true, skipped: false, pushSent: push.sent };
}
