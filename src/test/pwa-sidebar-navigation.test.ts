import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const ROOT = resolve(__dirname, '../..');

function readFile(relativePath: string): string {
  return readFileSync(resolve(ROOT, 'src', relativePath), 'utf-8');
}

function readPublicFile(relativePath: string): string {
  return readFileSync(resolve(ROOT, 'public', relativePath), 'utf-8');
}

describe('PWA sidebar navigation reliability', () => {
  test('service worker does not cache document navigations', () => {
    const sw = readPublicFile('sw.js');
    expect(sw).toContain('shouldCacheResponse');
    expect(sw).toContain("request.mode === 'navigate'");
    expect(sw).toMatch(/shouldCacheResponse[\s\S]*navigate[\s\S]*return false/);
  });

  test('service worker only serves exact navigation cache match before offline fallback', () => {
    const sw = readPublicFile('sw.js');
    expect(sw).toContain('resolveNavigationCacheFallback');
    expect(sw).not.toMatch(/resolveOfflineNavigationFallback\(\)[\s\S]*return fallback[\s\S]*request\.mode === 'navigate'/);
  });

  test('mobile drawer closes immediately for navigation without scroll animation', () => {
    const drawer = readFile('components/sidebar/MobileNavDrawer.tsx');
    const hook = readFile('hooks/use-mobile-nav-drawer.ts');
    const menu = readFile('components/sidebar/Menu.tsx');

    expect(hook).toContain('closeDrawerForNavigation');
    expect(drawer).toContain('closeDrawerForNavigation');
    expect(menu).toContain('closeDrawerForNavigation');
    expect(drawer).toMatch(/closeDrawerForNavigation[\s\S]*hidePopoverIfNeeded/);
  });

  test('view transition navigation resolves with a safety timeout', () => {
    const state = readFile('lib/view-transition-navigation-state.ts');
    expect(state).toContain('VIEW_TRANSITION_NAV_TIMEOUT_MS');
    expect(state).toMatch(/setTimeout[\s\S]*completeViewTransitionNavigation/);
  });

  test('view transition bridge closes mobile drawer on internal link click', () => {
    const nav = readFile('components/shell/ViewTransitionNavigation.tsx');
    expect(nav).toContain('closeDrawerForNavigation');
    expect(nav).toContain('normalizeAppPath');
  });

  test('auth session guard retries before forcing logout reload', () => {
    const guard = readFile('components/auth/AuthSessionGuard.tsx');
    expect(guard).toContain('SESSION_VERIFY_MAX_ATTEMPTS');
    expect(guard).toMatch(/catch[\s\S]*\/\/.*network|catch[\s\S]*return/);
  });

  test('PinGateway renders app shell while verifying existing client session', () => {
    const pin = readFile('components/auth/PinGateway.tsx');
    expect(pin).toContain('authCheckComplete');
    expect(pin).toContain('hadClientSession');
    expect(pin).toContain('isRestoringSession');
    expect(pin).not.toContain('/images/logo.png');
  });
});
