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

  test('mobile nav uses dedicated MobileNavDrawer with popover manual + scroll-snap', () => {
    const drawer = readFile('components/sidebar/MobileNavDrawer.tsx');
    expect(drawer).toMatch(/popover="manual"/);
    expect(drawer).toMatch(/bb-mobile-nav-drawer__scroller/);
    expect(drawer).toMatch(/bb-mobile-nav-drawer__sheet/);
    expect(drawer).toMatch(/IntersectionObserver/);
    const css = readFile('app/[locale]/globals.css');
    expect(css).toMatch(/scroll-snap-type:\s*x mandatory/);
    expect(css).toMatch(/bb-mobile-nav-drawer::backdrop/);
  });

  test('mobile header wires aria to MobileNavDrawer', () => {
    const header = readFile('components/sidebar/MobileNavHeader.tsx');
    expect(header).toMatch(/aria-controls="bb-nav-drawer"/);
    expect(header).toMatch(/useMobileNavDrawer/);
    expect(header).toMatch(/openDrawer/);
  });

  test('desktop Sidebar is isolated from mobile drawer', () => {
    const sidebar = readFile('components/sidebar/Sidebar.tsx');
    expect(sidebar).not.toMatch(/translate-x-full/);
    expect(sidebar).not.toMatch(/id="bb-nav-drawer"/);
    const layout = readFile('components/sidebar/SidebarLayout.tsx');
    expect(layout).toMatch(/showDesktopSidebar/);
    expect(layout).toMatch(/showMobileNav/);
  });

  test('SidebarLayout mounts MobileNavDrawer and desktop Sidebar separately', () => {
    const layout = readFile('components/sidebar/SidebarLayout.tsx');
    expect(layout).toMatch(/MobileNavDrawer/);
    expect(layout).toMatch(/MobileNavHeader/);
    expect(layout).not.toMatch(/z-\[90\].*bg-black/);
  });

  test('main becomes inert while mobile drawer is open', () => {
    const inertHook = readFile('hooks/use-mobile-nav-drawer-inert.ts');
    expect(inertHook).toMatch(/useMobileNavDrawer/);
    const layout = readFile('components/sidebar/SidebarLayout.tsx');
    expect(layout).toMatch(/inert=\{mobileDrawerInert \? true : undefined\}/);
  });

  test('Menu closes mobile drawer on navigation', () => {
    const menu = readFile('components/sidebar/Menu.tsx');
    expect(menu).toMatch(/closeDrawer/);
    expect(menu).toMatch(/useMobileNavDrawer/);
  });

  test('main content region uses container query root for responsive layout', () => {
    const layout = readFile('components/sidebar/SidebarLayout.tsx');
    expect(layout).toMatch(/bb-main-container/);
    const css = readFile('app/[locale]/globals.css');
    expect(css).toMatch(/\.bb-main-container/);
    expect(css).toMatch(/container-type:\s*inline-size/);
  });
});
