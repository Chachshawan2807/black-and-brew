import { NextRequest } from 'next/server';
import { describe, expect, test } from 'vitest';
import { rewriteLocalePrefixedPublicAsset } from '@/lib/locale-prefixed-public-asset';
import { isPublicRootAssetPath } from '@/lib/pwa-public-asset-paths';

describe('PWA service worker routing (no locale redirect)', () => {
  test('root sw.js and PWA scripts are public assets', () => {
    expect(isPublicRootAssetPath('/sw.js')).toBe(true);
    expect(isPublicRootAssetPath('/pwa-assets.js')).toBe(true);
    expect(isPublicRootAssetPath('/notification-store.js')).toBe(true);
    expect(isPublicRootAssetPath('/offline.html')).toBe(true);
    expect(isPublicRootAssetPath('/th/inventory')).toBe(false);
  });

  test('rewrites locale-prefixed /th/sw.js to root /sw.js', () => {
    const request = new NextRequest('https://blackandbrew.vercel.app/th/sw.js');
    const response = rewriteLocalePrefixedPublicAsset(request);
    expect(response).not.toBeNull();
    expect(response?.headers.get('x-middleware-rewrite')).toMatch(/\/sw\.js$/);
  });

  test('rewrites locale-prefixed /th/pwa-assets.js to root', () => {
    const request = new NextRequest('https://blackandbrew.vercel.app/th/pwa-assets.js');
    const response = rewriteLocalePrefixedPublicAsset(request);
    expect(response).not.toBeNull();
    expect(response?.headers.get('x-middleware-rewrite')).toMatch(/\/pwa-assets\.js$/);
  });
});
