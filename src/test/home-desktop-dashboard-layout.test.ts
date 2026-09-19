import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

describe('Home page empty shell', () => {
  test('index page redirects to home instead of rendering dashboard widgets', () => {
    const page = readFile('app/[locale]/page.tsx');
    expect(page).toMatch(/redirect\(/);
    expect(page).toMatch(/\/home/);
    expect(page).not.toMatch(/LiveStatusTracker/);
    expect(page).not.toMatch(/HomeOpsPanels/);
  });
});

describe('Home secretary board desktop split', () => {
  test('HomeClient uses two columns for tasks and shifts when sidebar is collapsed', () => {
    const home = readFile('app/[locale]/home/HomeClient.tsx');
    const frame = readFile('app/[locale]/home/_components/HomeDashboardFrame.tsx');
    expect(home).toMatch(/useSidebarToggle/);
    expect(frame).toMatch(/desktopSplit/);
    expect(frame).toMatch(/md:grid md:grid-cols-2/);
    expect(frame).toMatch(/showWhenEmpty=\{desktopSplit\}/);
  });
});

describe('Home desktop dashboard layout collapsed sidebar', () => {
  test('HomeOpsPanels keeps mobile tab panels hidden on desktop', () => {
    const panels = readFile('app/[locale]/_components/HomeOpsPanels.tsx');
    expect(panels).toMatch(/<div className="md:hidden">/);
    expect(panels).not.toMatch(/isDashboard && 'md:flex-1 md:min-h-0 md:flex md:flex-col'/);
  });

  test('HomeOpsPanels stacks on expanded sidebar and uses 50/50 only in dashboard mode', () => {
    const panels = readFile('app/[locale]/_components/HomeOpsPanels.tsx');
    expect(panels).toMatch(/isDashboard\s*\?\s*'md:grid-cols-2/);
    expect(panels).toMatch(/:\s*'md:grid-cols-1'/);
    expect(panels).toMatch(/SegmentTabBar/);
    expect(panels).toMatch(/md:flex-\[9\]/);
  });

  test('LiveStatusTracker fills dashboard panels with stretchable employee card grid', () => {
    const tracker = readFile('app/[locale]/_components/LiveStatusTracker.tsx');
    expect(tracker).toMatch(/layout\?:/);
    expect(tracker).toMatch(/md:grid-cols-2/);
    expect(tracker).toMatch(/auto-fill,minmax\(8\.75rem,1fr\)/);
    expect(tracker).toMatch(/auto-rows-\[minmax\(5\.75rem,1fr\)\]/);
    expect(tracker).toMatch(/dashboard/);
  });

  test('HomePurchaseOrdersSection grows with internal scroll in dashboard mode', () => {
    const section = readFile('app/[locale]/_components/HomePurchaseOrdersSection.tsx');
    const primitives = readFile('app/[locale]/_components/home-panel-primitives.tsx');
    expect(section).toMatch(/layout\?:/);
    expect(section).toMatch(/dashboard/);
    expect(section).toMatch(/HomePanelTableShell/);
    expect(primitives).toMatch(/md:flex-1/);
    expect(primitives).toMatch(/md:min-h-0/);
  });

  test('mobile purchase order cards keep existing scroll container', () => {
    const section = readFile('app/[locale]/_components/HomePurchaseOrdersSection.tsx');
    const primitives = readFile('app/[locale]/_components/home-panel-primitives.tsx');
    expect(section).toMatch(/HomePanelMobileScroll/);
    expect(primitives).toMatch(/md:hidden max-h-\[min\(60svh,28rem\)\]/);
  });
});
