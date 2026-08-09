import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const sidebarLayoutPath = resolve(__dirname, '../components/sidebar/SidebarLayout.tsx');
const offlineBannerPath = resolve(__dirname, '../components/shell/OfflineStatusBanner.tsx');

describe('offline status banner wiring', () => {
  test('SidebarLayout renders global OfflineStatusBanner above page content', () => {
    const source = readFileSync(sidebarLayoutPath, 'utf-8');
    expect(source).toContain('OfflineStatusBanner');
    expect(source).toMatch(/<OfflineStatusBanner\s*\/>\s*\n\s*<PageTransition>/);
  });

  test('OfflineStatusBanner exposes accessible live status region', () => {
    const source = readFileSync(offlineBannerPath, 'utf-8');
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('resolveOfflineBannerView');
    expect(source).toContain('requestOfflineSyncRetry');
  });
});
