import { describe, expect, it } from 'vitest';
import { shouldNotifyForAction } from '@/lib/notification-preferences';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
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

    expect(shouldNotifyForAction(enabled, 'CREATE')).toBe(true);
    expect(shouldNotifyForAction(enabled, 'UPDATE')).toBe(true);
    expect(shouldNotifyForAction(enabled, 'BULK_UPDATE')).toBe(true);
    expect(shouldNotifyForAction(enabled, 'DELETE')).toBe(true);
    expect(shouldNotifyForAction(enabled, 'BULK_DELETE')).toBe(true);
  });

  it('notifies nothing when inventory alerts are disabled', () => {
    const disabled = prefs({ enabled: false });

    expect(shouldNotifyForAction(disabled, 'CREATE')).toBe(false);
    expect(shouldNotifyForAction(disabled, 'UPDATE')).toBe(false);
    expect(shouldNotifyForAction(disabled, 'DELETE')).toBe(false);
  });
});
