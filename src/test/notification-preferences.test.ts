import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  ensureFullNotificationPreferencesOnAuth,
  hasNotificationUserOptOut,
  isNotificationMasterEnabled,
  loadNotificationPreferences,
  notificationMasterPatch,
  notificationPreferencesEqual,
  saveNotificationPreferences,
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
  it('uses only the inventory master switch not per-action toggles', () => {
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

  it('does not re-dispatch prefs-changed when channels are already fully enabled', () => {
    localStorage.setItem(
      NOTIFICATION_PREFS_KEY,
      JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES),
    );

    let dispatchCount = 0;
    const onPrefsChanged = () => {
      dispatchCount += 1;
    };
    window.addEventListener('bb-notification-prefs-changed', onPrefsChanged);

    ensureFullNotificationPreferencesOnAuth();
    ensureFullNotificationPreferencesOnAuth();
    ensureFullNotificationPreferencesOnAuth();

    window.removeEventListener('bb-notification-prefs-changed', onPrefsChanged);
    expect(dispatchCount).toBe(0);
  });

  it('survives a prefs-changed listener that re-enters ensureFull without stack overflow', () => {
    localStorage.setItem(
      NOTIFICATION_PREFS_KEY,
      JSON.stringify({ ...DEFAULT_NOTIFICATION_PREFERENCES, proactiveInsights: false }),
    );

    const onPrefsChanged = () => {
      ensureFullNotificationPreferencesOnAuth();
    };
    window.addEventListener('bb-notification-prefs-changed', onPrefsChanged);

    expect(() => ensureFullNotificationPreferencesOnAuth()).not.toThrow();
    expect(isNotificationMasterEnabled(loadNotificationPreferences())).toBe(true);

    window.removeEventListener('bb-notification-prefs-changed', onPrefsChanged);
  });
});

describe('saveNotificationPreferences recursion guards', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('notificationPreferencesEqual compares channel flags', () => {
    const a = prefs();
    const b = prefs({ proactiveInsights: false });
    expect(notificationPreferencesEqual(a, a)).toBe(true);
    expect(notificationPreferencesEqual(a, { ...a })).toBe(true);
    expect(notificationPreferencesEqual(a, b)).toBe(false);
  });

  it('does not dispatch when saving identical preferences', () => {
    localStorage.setItem(
      NOTIFICATION_PREFS_KEY,
      JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES),
    );

    let dispatchCount = 0;
    const onPrefsChanged = () => {
      dispatchCount += 1;
    };
    window.addEventListener('bb-notification-prefs-changed', onPrefsChanged);

    saveNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES });
    saveNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES });

    window.removeEventListener('bb-notification-prefs-changed', onPrefsChanged);
    expect(dispatchCount).toBe(0);
  });

  it('survives a prefs-changed listener that re-saves the same prefs', () => {
    const next = prefs({ enabled: false, systemNotifications: false });

    let dispatchCount = 0;
    const onPrefsChanged = () => {
      dispatchCount += 1;
      if (dispatchCount > 50) return;
      // Mimic a buggy listener that saves again during the same event.
      saveNotificationPreferences(loadNotificationPreferences());
    };
    window.addEventListener('bb-notification-prefs-changed', onPrefsChanged);

    expect(() => saveNotificationPreferences(next)).not.toThrow();
    expect(dispatchCount).toBe(1);
    expect(loadNotificationPreferences().enabled).toBe(false);

    window.removeEventListener('bb-notification-prefs-changed', onPrefsChanged);
  });

  it('blocks nested prefs-changed dispatch while a save is already dispatching', () => {
    let nestedDispatches = 0;
    const onPrefsChanged = () => {
      nestedDispatches += 1;
      if (nestedDispatches > 50) return;
      // Force a *different* nested write during dispatch must not re-enter dispatch.
      saveNotificationPreferences(
        prefs({
          enabled: nestedDispatches === 1,
          systemNotifications: nestedDispatches === 1,
          dailyScheduleReports: nestedDispatches === 1,
          proactiveInsights: nestedDispatches === 1,
          securityAlerts: nestedDispatches === 1,
        }),
      );
    };
    window.addEventListener('bb-notification-prefs-changed', onPrefsChanged);

    expect(() => saveNotificationPreferences(prefs({ enabled: false }))).not.toThrow();
    // Outer event only nested save must not fire another synchronous event.
    expect(nestedDispatches).toBe(1);

    window.removeEventListener('bb-notification-prefs-changed', onPrefsChanged);
  });
});
