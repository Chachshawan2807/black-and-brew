import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';
import { buildInventoryOsNotification } from '@/lib/pwa-notification-bridge';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type InventoryNotification,
  type NotificationPreferences,
} from '@/lib/notification-types';
import { buildPwaNotificationAssetPaths } from '@/lib/pwa-assets';

export function secretaryNotificationLogId(dateIso: string): string {
  return `secretary-digest-${dateIso}`;
}

export function buildSecretaryDigestSummary(
  tasks: SecretaryTask[],
  snapshot: SecretarySnapshot,
  guidanceText?: string,
): { title: string; summary: string; pendingCount: number } {
  const pending = tasks.filter(
    (task) =>
      task.status === 'pending' &&
      (!task.snoozed_until || task.snoozed_until <= new Date().toISOString()),
  );

  const urgentCount = pending.filter((task) => task.priority === 'urgent').length;

  if (pending.length === 0) {
    const emptySummary =
      guidanceText?.trim() ||
      'งานวันนี้เสร็จครบแล้ว';
    return {
      title: 'เลขาส่วนตัว — ไม่มีงานค้าง',
      summary: emptySummary,
      pendingCount: 0,
    };
  }

  const headline = snapshot.isBranch2Day
    ? `วันไปสาขา 2 — งานค้าง ${pending.length} รายการ`
    : `งานค้างวันนี้ ${pending.length} รายการ`;

  const summary =
    guidanceText?.trim() ||
    [
      headline,
      urgentCount > 0 ? `เร่งด่วน ${urgentCount}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

  return {
    title: 'เลขาส่วนตัว',
    summary,
    pendingCount: pending.length,
  };
}

export function formatSecretaryNotification(
  tasks: SecretaryTask[],
  snapshot: SecretarySnapshot,
  locale = 'th',
  guidanceText?: string,
): InventoryNotification {
  const digest = buildSecretaryDigestSummary(tasks, snapshot, guidanceText);
  const now = new Date().toISOString();
  const logId = secretaryNotificationLogId(snapshot.dateIso);
  const url = `/${locale}/secretary`;

  return {
    id: logId,
    logId,
    action: 'UPDATE',
    entityId: snapshot.dateIso,
    entityLabel: snapshot.dateIso,
    actorLabel: locale === 'th' ? 'เลขาส่วนตัว' : 'Personal Secretary',
    occurredAt: now,
    title: digest.title,
    summary: digest.summary,
    fieldSummary: digest.summary,
    priority: digest.pendingCount > 3 ? 'high' : 'normal',
    read: false,
    batchedCount: 1,
    metadata: {
      kind: 'secretary_digest',
      module: 'secretary',
      url,
      pendingCount: digest.pendingCount,
      isBranch2Day: snapshot.isBranch2Day,
    },
  };
}

export function parseSecretaryPushPrefs(
  raw: Record<string, unknown> | null | undefined,
): NotificationPreferences & { locale: string } {
  const locale = typeof raw?.locale === 'string' ? raw.locale : 'th';
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(raw as Partial<NotificationPreferences>),
    locale,
    dailyScheduleReports:
      typeof raw?.dailyScheduleReports === 'boolean'
        ? raw.dailyScheduleReports
        : DEFAULT_NOTIFICATION_PREFERENCES.dailyScheduleReports,
    proactiveInsights:
      typeof raw?.proactiveInsights === 'boolean'
        ? raw.proactiveInsights
        : DEFAULT_NOTIFICATION_PREFERENCES.proactiveInsights,
    secretaryAlerts:
      typeof raw?.secretaryAlerts === 'boolean'
        ? raw.secretaryAlerts
        : DEFAULT_NOTIFICATION_PREFERENCES.secretaryAlerts,
    securityAlerts:
      typeof raw?.securityAlerts === 'boolean'
        ? raw.securityAlerts
        : DEFAULT_NOTIFICATION_PREFERENCES.securityAlerts,
  };
}

export function shouldSendSecretaryToSubscription(
  _notification: InventoryNotification,
  subscription: { prefs_json?: Record<string, unknown> | null },
): boolean {
  const prefs = parseSecretaryPushPrefs(subscription.prefs_json ?? null);
  return prefs.secretaryAlerts;
}

export function buildSecretaryPushPayload(
  tasks: SecretaryTask[],
  snapshot: SecretarySnapshot,
  locale = 'th',
  guidanceText?: string,
) {
  const notification = formatSecretaryNotification(tasks, snapshot, locale, guidanceText);
  const os = buildInventoryOsNotification(notification.title, notification.summary, 1, locale === 'th', {
    fieldSummary: notification.summary,
  });
  const url = `/${locale}/secretary`;

  return {
    kind: 'secretary_digest' as const,
    title: os.title,
    body: os.body,
    tag: secretaryNotificationLogId(snapshot.dateIso),
    url,
    locale,
    notification,
    unreadCount: notification.metadata.pendingCount as number,
    assets: buildPwaNotificationAssetPaths(),
  };
}
