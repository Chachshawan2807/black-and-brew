import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { isWellKnownProbePath } from '@/lib/well-known-probe';

const ROOT = path.resolve(__dirname, '../..');

describe('isWellKnownProbePath', () => {
  test('matches Chrome DevTools well-known probes with and without a locale prefix', () => {
    expect(
      isWellKnownProbePath('/.well-known/appspecific/com.chrome.devtools.json'),
    ).toBe(true);
    expect(
      isWellKnownProbePath('/th/.well-known/appspecific/com.chrome.devtools.json'),
    ).toBe(true);
    expect(
      isWellKnownProbePath('/en/.well-known/appspecific/com.chrome.devtools.json'),
    ).toBe(true);
    expect(isWellKnownProbePath('/.well-known')).toBe(true);
    expect(isWellKnownProbePath('/th/.well-known')).toBe(true);
  });

  test('does not match app routes or lookalikes', () => {
    expect(isWellKnownProbePath('/th/schedule')).toBe(false);
    expect(isWellKnownProbePath('/th/home')).toBe(false);
    expect(isWellKnownProbePath('/api/home/refresh')).toBe(false);
    expect(isWellKnownProbePath('/th/home/.well-known')).toBe(false);
    expect(isWellKnownProbePath('/manifest.webmanifest')).toBe(false);
  });
});

describe('proxy short-circuits well-known probes before the app router', () => {
  test('matcher includes dotted well-known paths and proxy rejects them before intl', () => {
    const proxy = fs.readFileSync(path.join(ROOT, 'src/proxy.ts'), 'utf-8');
    const wellKnownIdx = proxy.indexOf('isWellKnownProbePath');
    const intlIdx = proxy.indexOf('intlMiddleware(request)');
    expect(wellKnownIdx).toBeGreaterThan(-1);
    expect(intlIdx).toBeGreaterThan(wellKnownIdx);
    expect(proxy).toContain('/.well-known/:path*');
    expect(proxy).toContain('/:locale/.well-known/:path*');

    const nextConfig = fs.readFileSync(path.join(ROOT, 'next.config.ts'), 'utf-8');
    expect(nextConfig).toContain("source: '/:locale/.well-known/:path*'");
    expect(nextConfig).toContain("destination: '/.well-known/:path*'");
  });
});
