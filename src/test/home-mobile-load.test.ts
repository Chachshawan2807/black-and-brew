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
const appShellPath = resolve(__dirname, '../components/shell/AppShell.tsx');
const appShellLoaderPath = resolve(__dirname, '../components/shell/AppShellLoader.tsx');
const layoutPath = resolve(__dirname, '../app/[locale]/layout.tsx');
const coarsePointerPath = resolve(__dirname, '../hooks/use-coarse-pointer.ts');

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
    expect(source).toContain('bb-home-board:v3');
    expect(source).toContain('readCachedHomeMemberPanel');
    expect(source).toContain('writeCachedHomeMemberPanel');
  });

  test('PinGateway keeps SSR children visible when the PIN cookie is already verified', () => {
    const source = readFileSync(pinGatewayPath, 'utf-8');
    expect(source).toContain('ssrVerified');
    expect(source).not.toMatch(/if\s*\(\s*!isMounted\s*\)\s*\{\s*return null;\s*\}/);
  });

  test('app shell forwards the SSR PIN cookie so home HTML is not wiped on mobile hydrate', () => {
    const loader = readFileSync(appShellLoaderPath, 'utf-8');
    const shell = readFileSync(appShellPath, 'utf-8');
    const layout = readFileSync(layoutPath, 'utf-8');
    expect(loader).toContain('bb_auth_pin_verified');
    expect(loader).toContain('ssrVerified');
    expect(shell).toMatch(/<PinGateway[\s\S]*ssrVerified/);
    expect(layout).toMatch(/<Suspense[\s\S]*<AppShellLoader>/);
  });

  test('home client entry skips the PIN wait when same-day cache already painted', () => {
    const source = readFileSync(homeEntryPath, 'utf-8');
    expect(source).toMatch(
      /tryLoadBoard\(\{\s*skipPinWait:\s*boardFromCacheOnInitRef\.current\s*\}\)/,
    );
  });

  test('coarse pointer defers full board sync so cellular is not saturated after first paint', () => {
    const coarse = readFileSync(coarsePointerPath, 'utf-8');
    const homeClient = readFileSync(homeClientPath, 'utf-8');
    expect(coarse).toContain('export function isCoarsePointer');
    expect(homeClient).toContain('isCoarsePointer');
    expect(homeClient).toMatch(
      /isCoarsePointer\([\s\S]*scheduleIdleWork\([\s\S]*requestHomeBoardFullSync/,
    );
  });

  test('isCoarsePointer reads matchMedia without waiting for React state', async () => {
    const { isCoarsePointer } = await import('@/hooks/use-coarse-pointer');
    expect(
      isCoarsePointer({
        matchMedia: () => ({ matches: true }) as MediaQueryList,
      }),
    ).toBe(true);
    expect(
      isCoarsePointer({
        matchMedia: () => ({ matches: false }) as MediaQueryList,
      }),
    ).toBe(false);
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
