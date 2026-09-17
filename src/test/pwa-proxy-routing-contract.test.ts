import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  PWA_PRECACHE_URLS,
  PWA_PROXY_PASSTHROUGH_PATHS,
  PWA_SERVICE_WORKER_PATH,
} from '@/lib/pwa-config';
import { isPublicRootAssetPath } from '@/lib/pwa-public-asset-paths';

const ROOT = path.resolve(__dirname, '../..');

describe('PWA proxy routing contract (prevents SW locale redirect regression)', () => {
  test('service worker path is in passthrough list', () => {
    expect(PWA_PROXY_PASSTHROUGH_PATHS).toContain(PWA_SERVICE_WORKER_PATH);
    expect(isPublicRootAssetPath(PWA_SERVICE_WORKER_PATH)).toBe(true);
  });

  test('every precached PWA script is passthrough-safe at root', () => {
    const scriptPrecachePaths = PWA_PRECACHE_URLS.filter(
      (url) => url.endsWith('.js') || url.endsWith('.html'),
    );
    for (const url of scriptPrecachePaths) {
      expect(
        isPublicRootAssetPath(url),
        `precache path ${url} must bypass locale redirect (add to PWA_PROXY_PASSTHROUGH_PATHS)`,
      ).toBe(true);
    }
  });

  test('proxy passes public assets before next-intl middleware', () => {
    const proxy = fs.readFileSync(path.join(ROOT, 'src/proxy.ts'), 'utf-8');
    const passIdx = proxy.indexOf('passThroughPublicRootAssets');
    const intlIdx = proxy.indexOf('intlMiddleware(request)');
    expect(passIdx).toBeGreaterThan(-1);
    expect(intlIdx).toBeGreaterThan(passIdx);
    expect(proxy).toContain('isPublicRootAssetPath');
  });

  test('locale rewrite module includes sw.js via PUBLIC_ROOT_ASSET_PATHS', () => {
    const rewrite = fs.readFileSync(
      path.join(ROOT, 'src/lib/locale-prefixed-public-asset.ts'),
      'utf-8',
    );
    expect(rewrite).toContain('PUBLIC_ROOT_ASSET_PATHS');
    expect(rewrite).toContain("rest.startsWith('/pwa-')");
  });
});
