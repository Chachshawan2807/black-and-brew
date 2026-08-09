import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_PREFS_KEY,
  type NotificationPreferences,
} from '@/lib/notification-types';
import type { DataChangeAction } from '@/lib/data-change-log';

/** Set when the user explicitly turns off the master notifications switch. */
export const NOTIFICATION_OPT_OUT_KEY = 'bb-notification-user-opted-out';

export function loadNotificationPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...parsed };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
}

export function saveNotificationPreferences(prefs: NotificationPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent('bb-notification-prefs-changed', { detail: prefs }));
  } catch {
    // ignore quota errors
  }
}

export function shouldNotifyForAction(
  prefs: NotificationPreferences,
  _action: DataChangeAction
): boolean {
  return prefs.enabled;
}

/** Master switch — inventory, system push, daily schedule, and proactive insights. */
export function isNotificationMasterEnabled(prefs: NotificationPreferences): boolean {
  return (
    prefs.enabled &&
    prefs.systemNotifications &&
    prefs.dailyScheduleReports &&
    prefs.proactiveInsights &&
    prefs.securityAlerts
  );
}

export function hasNotificationUserOptOut(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(NOTIFICATION_OPT_OUT_KEY) === '1';
  } catch {
    return false;
  }
}

export function setNotificationUserOptOut(optedOut: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (optedOut) {
      localStorage.setItem(NOTIFICATION_OPT_OUT_KEY, '1');
    } else {
      localStorage.removeItem(NOTIFICATION_OPT_OUT_KEY);
    }
  } catch {
    // ignore quota / private browsing
  }
}

/**
 * After PIN auth, enable every notification channel unless the user previously
 * opted out via the master switch in Settings.
 */
export function ensureFullNotificationPreferencesOnAuth(): NotificationPreferences {
  if (hasNotificationUserOptOut()) {
    return loadNotificationPreferences();
  }

  const current = loadNotificationPreferences();
  const next: NotificationPreferences = {
    ...current,
    ...notificationMasterPatch(true),
    notifyOwnChanges: current.notifyOwnChanges ?? true,
  };
  saveNotificationPreferences(next);
  return next;
}

export function notificationMasterPatch(
  enabled: boolean,
): Pick<
  NotificationPreferences,
  'enabled' | 'systemNotifications' | 'dailyScheduleReports' | 'proactiveInsights' | 'securityAlerts'
> {
  if (!enabled) {
    return {
      enabled: false,
      systemNotifications: false,
      dailyScheduleReports: false,
      proactiveInsights: false,
      securityAlerts: false,
    };
  }
  return {
    enabled: true,
    systemNotifications: true,
    dailyScheduleReports: true,
    proactiveInsights: true,
    securityAlerts: true,
  };
}
