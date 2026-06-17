import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

describe('Mobile sidebar layout — Modern Web Guidance alignment', () => {
  test('viewport must not block pinch-zoom (no maximumScale lock)', () => {
    const code = readFile('app/[locale]/layout.tsx');
    expect(code).not.toMatch(/maximumScale:\s*1/);
    expect(code).toMatch(/width:\s*['"]device-width['"]/);
    expect(code).toMatch(/initialScale:\s*1/);
  });

  test('mobile menu trigger exposes aria-expanded and aria-controls', () => {
    const code = readFile('components/sidebar/SidebarLayout.tsx');
    expect(code).toMatch(/aria-expanded=\{sidebarOpen\}/);
    expect(code).toMatch(/aria-controls="bb-nav-drawer"/);
    expect(code).toMatch(/type="button"/);
  });

  test('main becomes inert while mobile drawer is open', () => {
    const code = readFile('components/sidebar/SidebarLayout.tsx');
    expect(code).toMatch(/inert=\{mobileDrawerInert \? true : undefined\}/);
    expect(code).toMatch(/useMobileNavDrawerInert/);
  });

  test('mobile drawer dismisses on Escape', () => {
    const code = readFile('components/sidebar/SidebarLayout.tsx');
    expect(code).toMatch(/Escape/);
    expect(code).toMatch(/sidebarOpen/);
  });

  test('mobile overlay should not use backdrop-blur (compositor-safe)', () => {
    const code = readFile('components/sidebar/SidebarLayout.tsx');
    const overlayLine = code.split('\n').find((l) => l.includes('z-[90]'));
    expect(overlayLine).toBeDefined();
    expect(overlayLine).not.toContain('backdrop-blur');
  });

  test('sidebar sheet uses svh and dvw width cap on mobile', () => {
    const code = readFile('components/sidebar/Sidebar.tsx');
    expect(code).toMatch(/100svh/);
    expect(code).toMatch(/80dvw/);
    expect(code).not.toMatch(/100dvh/);
  });

  test('main content region is a container query root', () => {
    const code = readFile('components/sidebar/SidebarLayout.tsx');
    expect(code).toMatch(/bb-main-container/);
    const css = readFile('app/[locale]/globals.css');
    expect(css).toMatch(/\.bb-main-container/);
    expect(css).toMatch(/container-type:\s*inline-size/);
  });

  test('command center grid uses container queries not viewport-only columns', () => {
    const code = readFile('components/CommandCenterGrid.tsx');
    expect(code).toMatch(/bb-command-center/);
    expect(code).toMatch(/bb-command-center-grid/);
    const css = readFile('app/[locale]/globals.css');
    expect(css).toMatch(/@container bb-main/);
    expect(css).toMatch(/bb-command-center-grid/);
  });
});
