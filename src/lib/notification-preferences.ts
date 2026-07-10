import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_PREFS_KEY,
  type NotificationPreferences,
} from '@/lib/notification-types';
import type { DataChangeAction } from '@/lib/data-change-log';

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
