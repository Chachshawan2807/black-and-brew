import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  ensureFullNotificationPreferencesOnAuth,
  hasNotificationUserOptOut,
  isNotificationMasterEnabled,
  notificationMasterPatch,
  setNotificationUserOptOut,
  shouldNotifyForAction,
} from '@/lib/notification-preferences';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_PREFS_KEY,
  type NotificationPreferences,
} from '@/lib/notification-types';

function prefs(overrides: Partial<NotificationPreferences> = {}): NotificationPreferences {
  return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...overrides };
}

describe('shouldNotifyForAction', () => {
  it('uses only the inventory master switch — not per-action toggles', () => {
    // Legacy localStorage/server prefs may still carry per-action flags; ignore them.
    const enabled = {
      ...prefs({ enabled: true }),
      notifyCreate: false,
      notifyUpdate: false,
      notifyDelete: false,
    } as NotificationPreferences;

    expect(shouldNotifyForAction(enabled)).toBe(true);
    expect(shouldNotifyForAction(enabled)).toBe(true);
    expect(shouldNotifyForAction(enabled)).toBe(true);
    expect(shouldNotifyForAction(enabled)).toBe(true);
    expect(shouldNotifyForAction(enabled)).toBe(true);
  });

  it('notifies nothing when inventory alerts are disabled', () => {
    const disabled = prefs({ enabled: false });

    expect(shouldNotifyForAction(disabled)).toBe(false);
    expect(shouldNotifyForAction(disabled)).toBe(false);
    expect(shouldNotifyForAction(disabled)).toBe(false);
  });
});

describe('notification master switch', () => {
  it('is on only when inventory, system, schedule, insight, and security alerts are all enabled', () => {
    expect(isNotificationMasterEnabled(prefs())).toBe(true);
    expect(isNotificationMasterEnabled(prefs({ systemNotifications: false }))).toBe(false);
    expect(isNotificationMasterEnabled(prefs({ dailyScheduleReports: false }))).toBe(false);
    expect(isNotificationMasterEnabled(prefs({ proactiveInsights: false }))).toBe(false);
    expect(isNotificationMasterEnabled(prefs({ securityAlerts: false }))).toBe(false);
    expect(isNotificationMasterEnabled(prefs({ enabled: false }))).toBe(false);
  });

  it('notificationMasterPatch toggles all main channels together', () => {
    expect(notificationMasterPatch(false)).toEqual({
      enabled: false,
      systemNotifications: false,
      dailyScheduleReports: false,
      proactiveInsights: false,
      securityAlerts: false,
    });
    expect(notificationMasterPatch(true)).toEqual({
      enabled: true,
      systemNotifications: true,
      dailyScheduleReports: true,
      proactiveInsights: true,
      securityAlerts: true,
    });
  });
});

describe('ensureFullNotificationPreferencesOnAuth', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('enables all main channels when the user has not opted out', () => {
    localStorage.setItem(
      NOTIFICATION_PREFS_KEY,
      JSON.stringify({ ...DEFAULT_NOTIFICATION_PREFERENCES, proactiveInsights: false }),
    );

    const prefs = ensureFullNotificationPreferencesOnAuth();

    expect(isNotificationMasterEnabled(prefs)).toBe(true);
    expect(JSON.parse(localStorage.getItem(NOTIFICATION_PREFS_KEY) ?? '{}').proactiveInsights).toBe(true);
  });

  it('respects explicit opt-out from the master switch', () => {
    setNotificationUserOptOut(true);
    localStorage.setItem(
      NOTIFICATION_PREFS_KEY,
      JSON.stringify({ ...DEFAULT_NOTIFICATION_PREFERENCES, proactiveInsights: false }),
    );

    const prefs = ensureFullNotificationPreferencesOnAuth();

    expect(prefs.proactiveInsights).toBe(false);
    expect(hasNotificationUserOptOut()).toBe(true);
  });
});
