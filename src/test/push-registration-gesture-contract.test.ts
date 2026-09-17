import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  isDevicePushRegisteredOnServer,
  type DevicePushRegistrationState,
} from '@/lib/push-subscription-client';

const pushClientSource = readFileSync(
  resolve(__dirname, '../lib/push-subscription-client.ts'),
  'utf8',
);
const settingsSource = readFileSync(
  resolve(
    __dirname,
    '../app/[locale]/settings/_components/NotificationPreferencesSection.tsx',
  ),
  'utf8',
);

describe('push registration gesture contract', () => {
  test('isDevicePushRegisteredOnServer is true only for server state', () => {
    const states: DevicePushRegistrationState[] = ['server', 'local_only', 'none'];
    for (const state of states) {
      expect(isDevicePushRegisteredOnServer(state)).toBe(state === 'server');
    }
  });

  test('registerDevicePushFromUserGesture subscribes under gesture before reconcile auth wait', () => {
    const block = pushClientSource.match(
      /export async function registerDevicePushFromUserGesture[\s\S]*?^}/m,
    )?.[0];
    expect(block).toBeTruthy();
    expect(block).toMatch(/subscribeLocalPushUnderUserGesture/);
    expect(block).toMatch(/await reconcileDevicePushRegistration/);
    expect(block).not.toMatch(/await ensurePushSubscriptionFromUserGesture/);
  });

  test('reconcile may subscribe before waitForAuthenticatedPushPrerequisites', () => {
    const block = pushClientSource.match(
      /export async function reconcileDevicePushRegistration[\s\S]*?^}/m,
    )?.[0];
    expect(block).toBeTruthy();
    expect(block).toMatch(/maySubscribeBeforeAuth/);
    expect(block).toMatch(
      /subscribeLocalPushUnderUserGesture[\s\S]*waitForAuthenticatedPushPrerequisites/,
    );
  });

  test('settings register button uses registerDevicePushFromUserGesture and isDevicePushRegisteredOnServer', () => {
    const registerBlock = settingsSource.match(
      /const registerThisDevice = async[\s\S]*?^\  };/m,
    )?.[0];
    expect(registerBlock).toBeTruthy();
    expect(registerBlock).toContain('registerDevicePushFromUserGesture');
    expect(registerBlock).toContain('isDevicePushRegisteredOnServer');
    expect(registerBlock).not.toContain('ensurePushSubscriptionFromUserGesture');
    expect(registerBlock).not.toMatch(/if \(!ok\)/);
    expect(registerBlock).not.toMatch(/ok && deviceState/);
  });
});
