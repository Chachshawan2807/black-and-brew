import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  isIosPwaInstallable,
  shouldShowPwaInstallOffer,
} from '@/lib/pwa-install';
import { PWA_KNOWN_IDB_NAMES } from '@/lib/pwa-install-reset';

const ROOT = resolve(__dirname, '../..');

describe('pwa-install', () => {
  test('shouldShowPwaInstallOffer hides when already installed', () => {
    expect(
      shouldShowPwaInstallOffer({
        installed: true,
        hasDeferredPrompt: true,
        isIosDevice: true,
      }),
    ).toBe(false);
  });

  test('shouldShowPwaInstallOffer shows for Chromium deferred prompt', () => {
    expect(
      shouldShowPwaInstallOffer({
        installed: false,
        hasDeferredPrompt: true,
        isIosDevice: false,
      }),
    ).toBe(true);
  });

  test('shouldShowPwaInstallOffer shows on iOS browser when not installed', () => {
    expect(
      shouldShowPwaInstallOffer({
        installed: false,
        hasDeferredPrompt: false,
        isIosDevice: true,
      }),
    ).toBe(true);
  });

  test('shouldShowPwaInstallOffer hides on unsupported desktop browsers', () => {
    expect(
      shouldShowPwaInstallOffer({
        installed: false,
        hasDeferredPrompt: false,
        isIosDevice: false,
      }),
    ).toBe(false);
  });

  test('isIosPwaInstallable detects iPhone and iPad user agents', () => {
    expect(isIosPwaInstallable('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(
      true,
    );
    expect(isIosPwaInstallable('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe(true);
    expect(isIosPwaInstallable('Mozilla/5.0 (Linux; Android 14)')).toBe(false);
  });

  test('PinGateway exposes PWA install affordance on the PIN screen', () => {
    const pinGateway = readFileSync(
      resolve(ROOT, 'src/components/auth/PinGateway.tsx'),
      'utf-8',
    );
    expect(pinGateway).toContain('PwaInstallButton');
  });
});

describe('pwa-install-reset', () => {
  test('prepareFreshPwaInstall clears known IndexedDB stores', () => {
    expect(PWA_KNOWN_IDB_NAMES).toContain('bb-notifications-v1');
    expect(PWA_KNOWN_IDB_NAMES).toContain('bb-offline-mutations-v1');
  });

  test('prepareFreshPwaInstall is wired before the install prompt', () => {
    const button = readFileSync(
      resolve(ROOT, 'src/components/PwaInstallButton.tsx'),
      'utf-8',
    );
    const reset = readFileSync(resolve(ROOT, 'src/lib/pwa-install-reset.ts'), 'utf-8');

    expect(button).toContain('prepareFreshPwaInstall');
    expect(button).toContain('กำลังเตรียมติดตั้งใหม่');
    expect(reset).toContain('unregisterAllServiceWorkers');
    expect(reset).toContain('deleteAllCacheStorage');
    expect(reset).toContain('clearAuth');
  });
});
