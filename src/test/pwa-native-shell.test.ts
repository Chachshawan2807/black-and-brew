import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import manifest from '@/app/manifest';
import {
  PWA_SHELL_BOOTSTRAP_SCRIPT,
  PWA_STANDALONE_CLASS,
  PWA_THEME_COLORS,
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
    expect(PWA_SHELL_BOOTSTRAP_SCRIPT).toContain('theme-color');
    expect(PWA_SHELL_BOOTSTRAP_SCRIPT).toContain('bb-theme');
    expect(PWA_SHELL_BOOTSTRAP_SCRIPT).toContain('display-mode: standalone');
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

  test('PwaRegister uses SPA navigation for notification deep links', () => {
    const pwa = readFileSync(resolve(ROOT, 'src/components/PwaRegister.tsx'), 'utf-8');
    expect(pwa).toContain('navigateWithViewTransition');
    expect(pwa).not.toContain('window.location.href = safeUrl');
  });

  test('PwaShellSync updates theme-color when resolved theme changes', () => {
    const sync = readFileSync(resolve(ROOT, 'src/components/PwaShellSync.tsx'), 'utf-8');
    expect(sync).toContain('useTheme');
    expect(sync).toContain('theme-color');
    expect(sync).toContain('resolvePwaThemeColor');
  });
});
