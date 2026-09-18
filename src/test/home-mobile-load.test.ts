import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { shouldIdlePreloadSecretaryOverlays } from '@/lib/secretary/preload-secretary-overlay';

const pinGatewayPath = resolve(__dirname, '../components/auth/PinGateway.tsx');
const homeEntryPath = resolve(
  __dirname,
  '../app/[locale]/home/_components/HomeClientEntry.tsx',
);
const homeClientPath = resolve(__dirname, '../app/[locale]/home/HomeClient.tsx');
const routePrefetchPath = resolve(
  __dirname,
  '../components/shell/RoutePrefetchOnIdle.tsx',
);
const cachePath = resolve(__dirname, '../lib/secretary/home-board-cache.ts');

describe('mobile home load', () => {
  test('PIN auth notifies the home board before push registration work', () => {
    const source = readFileSync(pinGatewayPath, 'utf-8');
    const complete = source.slice(source.indexOf('const completeAuthentication'));
    const eventAt = complete.indexOf("CustomEvent('bb-pin-authenticated')");
    const pushAt = complete.indexOf('registerPushAfterAuthentication');
    expect(eventAt).toBeGreaterThan(0);
    expect(pushAt).toBeGreaterThan(eventAt);
  });

  test('home client entry waits for the PIN event instead of polling checkAuth', () => {
    const source = readFileSync(homeEntryPath, 'utf-8');
    expect(source).toContain('waitForPinReadAccess');
    expect(source).toContain('bb-pin-authenticated');
    expect(source).not.toContain('SESSION_POLL_MS');
    expect(source).not.toMatch(/setTimeout\(\(\)\s*=>\s*\{\s*void poll\(\);\s*\},\s*SESSION_POLL_MS\)/);
  });

  test('PIN route prefetch yields to idle so home data can load first', () => {
    const source = readFileSync(routePrefetchPath, 'utf-8');
    expect(source).toContain('bb-pin-authenticated');
    expect(source).toMatch(
      /bb-pin-authenticated[\s\S]*scheduleIdleWork\([\s\S]*preloadCommonRouteChunks/,
    );
    expect(source).not.toMatch(
      /const onAuthenticated = \(\) => \{\s*if \(!cancelled\) preloadCommonRouteChunks\(\);/,
    );
  });

  test('home board cache survives a new mobile session via localStorage', () => {
    const source = readFileSync(cachePath, 'utf-8');
    expect(source).toContain('localStorage');
    expect(source).toContain('bb-home-board:v2');
    expect(source).toContain('readCachedHomeMemberPanel');
    expect(source).toContain('writeCachedHomeMemberPanel');
  });

  test('idle overlay preload is skipped on coarse pointer', () => {
    expect(
      shouldIdlePreloadSecretaryOverlays({
        matchMedia: () => ({ matches: true }),
      }),
    ).toBe(false);
    expect(
      shouldIdlePreloadSecretaryOverlays({
        matchMedia: () => ({ matches: false }),
      }),
    ).toBe(true);

    const homeClient = readFileSync(homeClientPath, 'utf-8');
    expect(homeClient).toContain('shouldIdlePreloadSecretaryOverlays');
  });
});
