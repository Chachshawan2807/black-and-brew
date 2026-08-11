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

  test('PWA install affordance is mounted in the app shell for PIN and authenticated views', () => {
    const layout = readFileSync(resolve(ROOT, 'src/app/[locale]/layout.tsx'), 'utf-8');
    expect(layout).toContain('PwaInstallShell');
  });
});

describe('pwa-install-reset', () => {
  test('prepareFreshPwaInstall clears known IndexedDB stores', () => {
    expect(PWA_KNOWN_IDB_NAMES).toContain('bb-notifications-v1');
    expect(PWA_KNOWN_IDB_NAMES).toContain('bb-offline-mutations-v1');
  });

  test('install prompt runs before storage reset so Chromium deferred prompt is not invalidated', () => {
    const button = readFileSync(
      resolve(ROOT, 'src/components/PwaInstallButton.tsx'),
      'utf-8',
    );

    const handleInstallStart = button.indexOf('const handleInstall');
    const promptIndex = button.indexOf('promptInstall()', handleInstallStart);
    const resetIndex = button.indexOf('prepareFreshPwaInstall', handleInstallStart);

    expect(promptIndex).toBeGreaterThan(handleInstallStart);
    expect(resetIndex).toBeGreaterThan(promptIndex);
  });

  test('iOS install opens the manual guide without awaiting storage reset', () => {
    const button = readFileSync(
      resolve(ROOT, 'src/components/PwaInstallButton.tsx'),
      'utf-8',
    );

    expect(button).toContain("mode === 'ios-manual'");
    expect(button).toContain('openIosGuide()');

    const iosBranch = button.slice(
      button.indexOf("mode === 'ios-manual'"),
      button.indexOf('openIosGuide()') + 'openIosGuide()'.length,
    );
    expect(iosBranch).not.toContain('await prepareFreshPwaInstall');
  });

  test('PWA install affordance is mounted in the app shell, not only on the PIN screen', () => {
    const layout = readFileSync(resolve(ROOT, 'src/app/[locale]/layout.tsx'), 'utf-8');
    const pinGateway = readFileSync(
      resolve(ROOT, 'src/components/auth/PinGateway.tsx'),
      'utf-8',
    );

    expect(layout).toContain('PwaInstallShell');
    expect(pinGateway).not.toContain('PwaInstallButton');
  });
});

describe('pwa-install-flow', () => {
  test('storage reset must not block install UI', async () => {
    const { shouldBlockInstallOnStorageReset } = await import('@/lib/pwa-install-flow');
    expect(shouldBlockInstallOnStorageReset('native')).toBe(false);
    expect(shouldBlockInstallOnStorageReset('ios-manual')).toBe(false);
  });

  test('only Chromium native install shows a preparing spinner', async () => {
    const { shouldShowPreparingState } = await import('@/lib/pwa-install-flow');
    expect(shouldShowPreparingState('native')).toBe(true);
    expect(shouldShowPreparingState('ios-manual')).toBe(false);
  });
});
