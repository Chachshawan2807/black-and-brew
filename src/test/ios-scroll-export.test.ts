import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

describe('iOS scroll & export fixes', () => {
  test('globals.css defines iOS-only scroll overrides', () => {
    const css = readFile('app/[locale]/globals.css');
    expect(css).toMatch(/@supports\s*\(-webkit-touch-callout:\s*none\)/);
    expect(css).toMatch(/\.bb-ios-scroll-host/);
    expect(css).toMatch(/\.bb-scroll-xy/);
    expect(css).toMatch(/overscroll-behavior:\s*auto/);
  });

  test('bb-smooth-scroll allows flex children to shrink for overflow', () => {
    const css = readFile('app/[locale]/globals.css');
    expect(css).toMatch(/\.bb-smooth-scroll\s*\{[\s\S]*min-width:\s*0/);
  });

  test('capture-element-png exports full scroll dimensions', () => {
    const code = readFile('lib/capture-element-png.ts');
    expect(code).toContain('scrollWidth');
    expect(code).toContain('scrollHeight');
    expect(code).toContain('maxHeight');
    expect(code).toContain('export async function captureElementAsPng');
  });

  test('ScheduleClient uses iOS scroll host and shared export helper', () => {
    const code = readFile('app/[locale]/schedule/ScheduleClient.tsx');
    expect(code).toContain('bb-ios-scroll-host');
    expect(code).toContain('bb-scroll-xy');
    expect(code).toContain('captureScheduleTableAsPng');
    expect(code).not.toMatch(/const\s*\{\s*toPng\s*\}\s*=\s*await\s+import\('html-to-image'\)/);
  });

  test('InventoryHistoryModal uses bidirectional iOS scroll class', () => {
    const code = readFile('components/inventory/InventoryHistoryModal.tsx');
    expect(code).toMatch(/bb-smooth-scroll bb-scroll-xy/);
  });
});
