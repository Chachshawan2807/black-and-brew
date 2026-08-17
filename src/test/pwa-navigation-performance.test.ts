import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const ROOT = resolve(__dirname, '../..');

describe('PWA navigation performance patterns', () => {
  test('service worker uses stale-while-revalidate for immutable assets', () => {
    const sw = readFileSync(resolve(ROOT, 'public/sw.js'), 'utf-8');
    expect(sw).toContain('staleWhileRevalidate');
    expect(sw).toContain("/_next/static/");
    expect(sw).toContain("event.request.mode === 'navigate'");
    expect(sw).toContain('networkFirstWithOfflineFallback');
  });

  test('service worker bypasses dev Turbopack chunks on localhost', () => {
    const sw = readFileSync(resolve(ROOT, 'public/sw.js'), 'utf-8');
    expect(sw).toContain('shouldBypassSwFetchForDev');
    expect(sw).toContain("url.pathname.includes('/_next/')");
    expect(sw).toContain("hostname === 'localhost'");
  });

  test('route preload warms common ERP routes on idle', () => {
    const preload = readFileSync(resolve(ROOT, 'src/lib/route-chunk-preload.ts'), 'utf-8');
    expect(preload).toContain('preloadCommonRouteChunks');
    expect(preload).toContain("COMMON_ROUTE_KEYS = ['inventory', 'schedule', 'dashboard']");
  });

  test('layout mounts idle route prefetch without blocking shell', () => {
    const layout = readFileSync(resolve(ROOT, 'src/app/[locale]/layout.tsx'), 'utf-8');
    expect(layout).toContain('RoutePrefetchOnIdle');
    expect(layout).toContain('RouteLoadingSkeleton');
  });

  test('nav links prefetch on touch for mobile PWA', () => {
    const link = readFileSync(resolve(ROOT, 'src/components/sidebar/NavPreloadLink.tsx'), 'utf-8');
    expect(link).toContain('onTouchStart');
    expect(link).toContain('onPointerDown');
    expect(link).toContain('prefetch');
  });

  test('globals apply touch-action manipulation on interactive controls', () => {
    const css = readFileSync(resolve(ROOT, 'src/app/[locale]/globals.css'), 'utf-8');
    expect(css).toMatch(/:where\(a\[href\], button, \[role='button'\], label\[for\]\)\s*\{[\s\S]*touch-action:\s*manipulation/);
  });

  test('PWA register defers service worker to idle callback', () => {
    const pwa = readFileSync(resolve(ROOT, 'src/components/PwaRegister.tsx'), 'utf-8');
    expect(pwa).toContain('scheduleIdleWork');
    expect(pwa).not.toContain('setTimeout(() => {');
    expect(pwa).toContain('{ timeout: 500 }');
  });

  test('push registration proactively ensures service worker readiness', () => {
    const pushClient = readFileSync(resolve(ROOT, 'src/lib/push-subscription-client.ts'), 'utf-8');
    const pwaUpdate = readFileSync(resolve(ROOT, 'src/lib/pwa-update.ts'), 'utf-8');
    expect(pushClient).toContain('ensurePushServiceWorkerReady');
    expect(pwaUpdate).toContain('export function ensurePushServiceWorkerReady');
  });

  test('notifications defer realtime subscription until idle', () => {
    const hook = readFileSync(resolve(ROOT, 'src/hooks/use-inventory-notifications.ts'), 'utf-8');
    expect(hook).toContain('scheduleIdleWork');
    expect(hook).toContain('setRealtimeReady(true)');
  });
});