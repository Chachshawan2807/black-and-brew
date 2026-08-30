import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import manifest from '@/app/manifest';
import {
  PWA_ANDROID_CLASS,
  PWA_IOS_CLASS,
  PWA_SHELL_BOOTSTRAP_SCRIPT,
  PWA_STANDALONE_CLASS,
  PWA_THEME_COLORS,
  isAndroidWebKit,
  isIosWebKit,
  resolvePwaThemeColor,
  resolveThemePreferenceFromStorage,
} from '@/lib/pwa-standalone';

const ROOT = resolve(__dirname, '../..');

describe('PWA native shell', () => {
  test('resolvePwaThemeColor matches ERP background tokens', () => {
    expect(resolvePwaThemeColor(false)).toBe(PWA_THEME_COLORS.light);
    expect(resolvePwaThemeColor(true)).toBe(PWA_THEME_COLORS.dark);
  });

  test('resolveThemePreferenceFromStorage respects bb-theme and system fallback', () => {
    expect(resolveThemePreferenceFromStorage('dark', false)).toBe('dark');
    expect(resolveThemePreferenceFromStorage('light', true)).toBe('light');
    expect(resolveThemePreferenceFromStorage('system', true)).toBe('dark');
    expect(resolveThemePreferenceFromStorage(null, false)).toBe('light');
  });

  test('bootstrap script sets standalone class and theme-color before paint', () => {
    expect(PWA_SHELL_BOOTSTRAP_SCRIPT).toContain(PWA_STANDALONE_CLASS);
    expect(PWA_SHELL_BOOTSTRAP_SCRIPT).toContain(PWA_IOS_CLASS);
    expect(PWA_SHELL_BOOTSTRAP_SCRIPT).toContain(PWA_ANDROID_CLASS);
    expect(PWA_SHELL_BOOTSTRAP_SCRIPT).toContain('theme-color');
    expect(PWA_SHELL_BOOTSTRAP_SCRIPT).toContain('bb-theme');
    expect(PWA_SHELL_BOOTSTRAP_SCRIPT).toContain('display-mode: standalone');
    expect(PWA_SHELL_BOOTSTRAP_SCRIPT).toContain('navigator.standalone');
  });

  test('isIosWebKit detects iPhone and iPad user agents', () => {
    expect(isIosWebKit('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true);
    expect(isIosWebKit('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe(true);
    expect(isIosWebKit('Mozilla/5.0 (Linux; Android 14)')).toBe(false);
  });

  test('isAndroidWebKit detects Android user agents', () => {
    expect(isAndroidWebKit('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe(true);
    expect(isAndroidWebKit('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(false);
  });

  test('mobile app shell avoids stacking header on full viewport main height', () => {
    const layout = readFileSync(resolve(ROOT, 'src/components/sidebar/SidebarLayout.tsx'), 'utf-8');
    expect(layout).toMatch(/flex-1 min-h-0/);
    expect(layout).not.toMatch(/min-h-\[100svh\]/);
  });

  test('mobile nav header grows with safe-area instead of fixed 72px height', () => {
    const header = readFileSync(resolve(ROOT, 'src/components/sidebar/MobileNavHeader.tsx'), 'utf-8');
    const headerClass = header.match(/<header className="([^"]+)"/)?.[1] ?? '';
    expect(headerClass).toContain('min-h-[72px]');
    expect(headerClass).not.toMatch(/(?:^|\s)h-\[72px\](?:\s|$)/);
  });

  test('globals.css applies iOS standalone safe-area and fill-available shell rules', () => {
    const css = readFileSync(resolve(ROOT, 'src/app/[locale]/globals.css'), 'utf-8');
    expect(css).toContain(`.${PWA_IOS_CLASS}`);
    expect(css).toMatch(/-webkit-fill-available/);
    expect(css).toMatch(/bb-mobile-nav-drawer__scroller[\s\S]*env\(safe-area-inset-top/);
    expect(css).toMatch(/bb-main-container[\s\S]*flex:\s*1/);
  });

  test('layout injects PWA shell bootstrap without blocking hydration', () => {
    const layout = readFileSync(resolve(ROOT, 'src/app/[locale]/layout.tsx'), 'utf-8');
    expect(layout).toContain('PWA_SHELL_BOOTSTRAP_SCRIPT');
    expect(layout).toContain('viewportFit: "cover"');
    expect(layout).toMatch(/themeColor:\s*\[/);
  });

  test('globals.css applies native shell rules only in standalone PWA', () => {
    const css = readFileSync(resolve(ROOT, 'src/app/[locale]/globals.css'), 'utf-8');
    expect(css).toContain(`.${PWA_STANDALONE_CLASS}`);
    expect(css).toMatch(/overscroll-behavior-y:\s*none/);
    expect(css).toContain('-webkit-tap-highlight-color: transparent');
    expect(css).toContain('bb-mobile-nav-header');
    expect(css).toContain('env(safe-area-inset-top');
  });

  test('manifest enables link capture and existing-client launch', () => {
    const m = manifest();
    expect(m.display_override).toContain('standalone');
    expect(m.launch_handler).toEqual({ client_mode: 'navigate-existing' });
    expect(m.handle_links).toBe('preferred');
    expect(m.prefer_related_applications).toBe(false);
  });

  test('manifest omits orientation so Android respects system rotation lock', () => {
    const m = manifest();
    expect(m.orientation).toBeUndefined();
  });

  test('PwaRegister syncs badge on Web Push click without SPA navigation', () => {
    const pwa = readFileSync(resolve(ROOT, 'src/components/PwaRegister.tsx'), 'utf-8');
    expect(pwa).toContain("data?.type !== 'NOTIFICATION_CLICK'");
    expect(pwa).toContain('syncBadgeFromStorage');
    expect(pwa).not.toContain('navigateWithoutViewTransition');
    expect(pwa).not.toContain('router.push');
  });

  test('PwaShellSync updates theme-color when resolved theme changes', () => {
    const sync = readFileSync(resolve(ROOT, 'src/components/PwaShellSync.tsx'), 'utf-8');
    expect(sync).toContain('useTheme');
    expect(sync).toContain('theme-color');
    expect(sync).toContain('resolvePwaThemeColor');
    expect(sync).toContain('PWA_IOS_CLASS');
    expect(sync).toContain('isIosWebKit');
    expect(sync).toContain('PWA_ANDROID_CLASS');
    expect(sync).toContain('isAndroidWebKit');
  });
});
