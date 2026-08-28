import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_PREFS_KEY,
  type NotificationPreferences,
} from '@/lib/notification-types';

/** Set when the user explicitly turns off the master notifications switch. */
export const NOTIFICATION_OPT_OUT_KEY = 'bb-notification-user-opted-out';

/** Blocks nested `bb-notification-prefs-changed` while a save is already dispatching. */
let isDispatchingPrefsChanged = false;

/** Blocks re-entrant ensureFull while an outer call is still applying prefs. */
let isEnsuringFullOnAuth = false;

export function notificationPreferencesEqual(
  a: NotificationPreferences,
  b: NotificationPreferences,
): boolean {
  return (
    a.enabled === b.enabled &&
    a.systemNotifications === b.systemNotifications &&
    a.dailyScheduleReports === b.dailyScheduleReports &&
    a.proactiveInsights === b.proactiveInsights &&
    a.secretaryAlerts === b.secretaryAlerts &&
    a.securityAlerts === b.securityAlerts &&
    (a.notifyOwnChanges ?? true) === (b.notifyOwnChanges ?? true)
  );
}

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

  // No-op when nothing changed — stops prefs-changed → save → prefs-changed loops.
  if (notificationPreferencesEqual(loadNotificationPreferences(), prefs)) {
    return;
  }

  try {
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));

    // Nested saves during an in-flight dispatch update storage only (no re-dispatch).
    if (isDispatchingPrefsChanged) {
      return;
    }

    isDispatchingPrefsChanged = true;
    try {
      window.dispatchEvent(new CustomEvent('bb-notification-prefs-changed', { detail: prefs }));
    } finally {
      isDispatchingPrefsChanged = false;
    }
  } catch {
    // ignore quota errors
  }
}

export function shouldNotifyForAction(prefs: NotificationPreferences): boolean {
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
 * Skips save/dispatch when prefs are already fully enabled — prevents a
 * synchronous prefs-changed → resume → ensureFull loop (stack overflow).
 */
export function ensureFullNotificationPreferencesOnAuth(): NotificationPreferences {
  if (isEnsuringFullOnAuth) {
    return loadNotificationPreferences();
  }

  isEnsuringFullOnAuth = true;
  try {
    if (hasNotificationUserOptOut()) {
      return loadNotificationPreferences();
    }

    const current = loadNotificationPreferences();
    const next: NotificationPreferences = {
      ...current,
      ...notificationMasterPatch(true),
      notifyOwnChanges: current.notifyOwnChanges ?? true,
    };

    if (notificationPreferencesEqual(current, next)) {
      return current;
    }

    saveNotificationPreferences(next);
    return next;
  } finally {
    isEnsuringFullOnAuth = false;
  }
}

export function notificationMasterPatch(
  enabled: boolean,
): Pick<
  NotificationPreferences,
  'enabled' | 'systemNotifications' | 'dailyScheduleReports' | 'proactiveInsights' | 'secretaryAlerts' | 'securityAlerts'
> {
  if (!enabled) {
    return {
      enabled: false,
      systemNotifications: false,
      dailyScheduleReports: false,
      proactiveInsights: false,
      secretaryAlerts: false,
      securityAlerts: false,
    };
  }
  return {
    enabled: true,
    systemNotifications: true,
    dailyScheduleReports: true,
    proactiveInsights: true,
    secretaryAlerts: false,
    securityAlerts: true,
  };
}
