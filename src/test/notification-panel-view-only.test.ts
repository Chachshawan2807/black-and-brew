import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

const PANEL_PATH = 'components/notifications/NotificationPanel.tsx';
const FORBIDDEN_ROW_NAV_PATTERNS = [
  'useRouter',
  'router.push',
  'router.replace',
  '<Link',
  'next/link',
  'window.open',
  'onNavigate',
  'metadata?.url',
  'metadata.url',
  'href=',
  'role="button"',
  'cursor-pointer',
] as const;

describe('Notification panel view-only iron rule', () => {
  test('AGENTS.md documents the view-only notification panel standard', () => {
    const agents = readFile('../AGENTS.md');
    expect(agents).toContain('notification-panel-view-only-standard');
    expect(agents).toContain('VIEW-ONLY (IRON RULE)');
    expect(agents).toMatch(/ดูอย่างเดียว|view-only/i);
  });

  test('docs/rules.md documents the view-only notification panel standard', () => {
    const rules = readFile('../docs/rules.md');
    expect(rules).toContain('Notification Panel — View-Only (IRON RULE)');
    expect(rules).toContain('notification-panel-view-only.test.ts');
  });

  test('NotificationPanel rows do not navigate or link elsewhere', () => {
    const code = readFile(PANEL_PATH);
    for (const pattern of FORBIDDEN_ROW_NAV_PATTERNS) {
      expect(code).not.toContain(pattern);
    }
    expect(code).toContain('notification-panel-view-only-standard');
  });

  test('NotificationRow is a static container without row click handlers', () => {
    const code = readFile(PANEL_PATH);
    const rowBlock = code.slice(
      code.indexOf('function NotificationRow'),
      code.indexOf('export function NotificationPanel')
    );
    expect(rowBlock).not.toMatch(/\bonClick\b/);
    expect(rowBlock).not.toMatch(/<button\b/);
    expect(rowBlock).not.toMatch(/<a\b/);
  });

  test('panel chrome may close or manage history but not route away', () => {
    const code = readFile(PANEL_PATH);
    expect(code).toContain('closePanel');
    expect(code).toContain('markAllRead');
    expect(code).toContain('clearAll');
    expect(code).not.toContain('useRouter');
  });

  test('Web Push click focuses app without deep-link navigation', () => {
    const pwa = readFile('components/PwaRegister.tsx');
    const sw = readFile('../public/sw.js');

    expect(pwa).not.toContain('navigateWithoutViewTransition');
    expect(pwa).not.toContain('router.push');
    expect(pwa).not.toContain('resolveSameOriginNavigationUrl');
    expect(pwa).toContain("data?.type !== 'NOTIFICATION_CLICK'");

    expect(sw).toContain("client.postMessage({ type: 'NOTIFICATION_CLICK' })");
    expect(sw).not.toMatch(/postMessage\(\{ type: 'NOTIFICATION_CLICK', url/);
    expect(sw).toContain('openWindow(appShellUrl)');
    expect(sw).not.toMatch(/openWindow\(url\)/);
  });
});
