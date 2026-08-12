import type { InventoryNotification, NotificationPreferences } from '@/lib/notification-types';
import {
  isBeanOrderDeliveredNotification,
  isBeanOrderPaymentNotification,
  isProactiveInsightNotification,
  isScheduleNotification,
  isSecurityNotification,
} from '@/lib/notification-display-icon';

/** Keep realtime + FAB live when any notification channel is enabled. */
export function wantsInAppNotificationSync(prefs: NotificationPreferences): boolean {
  return (
    prefs.enabled ||
    prefs.systemNotifications ||
    prefs.dailyScheduleReports ||
    prefs.proactiveInsights ||
    prefs.securityAlerts
  );
}

export function isBeanOrderNotification(item: InventoryNotification): boolean {
  return isBeanOrderDeliveredNotification(item) || isBeanOrderPaymentNotification(item);
}

/** Per-channel OS banner gating — aligned with server Web Push prefs where possible. */
export function shouldShowOsNotification(
  notification: InventoryNotification,
  prefs: NotificationPreferences,
): boolean {
  if (isSecurityNotification(notification)) return prefs.securityAlerts;
  if (isScheduleNotification(notification)) return prefs.dailyScheduleReports;
  if (isProactiveInsightNotification(notification)) return prefs.proactiveInsights;
  if (isBeanOrderNotification(notification)) return prefs.systemNotifications;
  return prefs.enabled && prefs.systemNotifications;
}
