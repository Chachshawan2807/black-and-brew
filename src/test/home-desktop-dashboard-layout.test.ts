import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

describe('Home desktop dashboard layout — collapsed sidebar', () => {
  test('HomePageClient enables viewport-fit dashboard when sidebar is collapsed on desktop', () => {
    const client = readFile('app/[locale]/_components/HomePageClient.tsx');
    expect(client).toMatch(/useSidebarToggle/);
    expect(client).toMatch(/useMaxMd/);
    expect(client).toMatch(/dashboardLayout/);
    expect(client).toMatch(/layout=\{sectionLayout\}/);
    expect(client).toMatch(/md:h-\[100svh\]/);
    expect(client).toMatch(/md:overflow-hidden/);
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
    expect(section).toMatch(/layout\?:/);
    expect(section).toMatch(/dashboard/);
    expect(section).toMatch(/md:flex-1/);
    expect(section).toMatch(/md:min-h-0/);
  });

  test('mobile purchase order cards keep existing scroll container', () => {
    const section = readFile('app/[locale]/_components/HomePurchaseOrdersSection.tsx');
    expect(section).toMatch(/md:hidden max-h-\[min\(60svh,28rem\)\]/);
  });
});
