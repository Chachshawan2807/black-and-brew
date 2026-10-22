import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.resolve(__dirname, '../app/[locale]/settings/_components/NotificationPreferencesSection.tsx'),
  'utf8',
);

describe('notification preferences hydration', () => {
  test('browser-only preferences and permission do not determine the first render', () => {
    expect(source).toMatch(/useState<NotificationPreferences>\(DEFAULT_NOTIFICATION_PREFERENCES\)/);
    expect(source).toMatch(/useState<NotificationPermissionState>\('unsupported'\)/);
    expect(source).not.toMatch(/useState<NotificationPreferences>\(\(\)\s*=>\s*loadNotificationPreferences\(\)\)/);
    expect(source).not.toMatch(/useState\(\(\)\s*=>\s*getNotificationPermissionState\(\)\)/);
  });

  test('stored preferences and notification permission are loaded after mount', () => {
    expect(source).toMatch(/setPrefs\(loadedPrefs\)/);
    expect(source).toMatch(/setPermission\(getNotificationPermissionState\(\)\)/);
  });
});
