import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

describe('locale routing (Thai-first ERP)', () => {
  test('routing disables Accept-Language auto-detection', () => {
    const code = fs.readFileSync(
      path.resolve(__dirname, '../i18n/routing.ts'),
      'utf-8',
    );
    expect(code).toContain("defaultLocale: 'th'");
    expect(code).toContain('localeDetection: false');
  });

  test('proxy redirects /en paths to Thai locale', () => {
    const code = fs.readFileSync(
      path.resolve(__dirname, '../proxy.ts'),
      'utf-8',
    );
    expect(code).toContain("pathname === '/en'");
    expect(code).toContain("pathname === '/th'");
    expect(code).toContain("pathname.startsWith('/en/')");
    expect(code).toMatch(/\/th\$\{pathname\.slice\(3\)\}/);
  });

  test('proxy HTTP-redirects locale index to /th/home so App Router never hydrates a React redirect', () => {
    const code = fs.readFileSync(
      path.resolve(__dirname, '../proxy.ts'),
      'utf-8',
    );
    expect(code).toContain("pathname === '/th'");
    expect(code).toContain("url.pathname = '/th/home'");
    expect(code).toContain('redirectLocaleIndexToHome');
  });

  test('proxy uses Next.js 16 proxyConfig matcher', () => {
    const code = fs.readFileSync(
      path.resolve(__dirname, '../proxy.ts'),
      'utf-8',
    );
    expect(code).toContain('export const proxyConfig');
    expect(code).not.toMatch(/export const config\s*=/);
    expect(code).toMatch(/\(?!api\|_next\|_vercel/);
  });

  test('proxy rewrites locale-prefixed static assets to root paths', () => {
    const code = fs.readFileSync(
      path.resolve(__dirname, '../proxy.ts'),
      'utf-8',
    );
    expect(code).toContain('rewriteLocalePrefixedPublicAsset');
    expect(code).toMatch(/startsWith\('\/_next\/'\)/);
    expect(code).toContain("'/manifest.webmanifest'");
  });

  test('dev script uses webpack to avoid Turbopack /[locale] 404 in local dev', () => {
    const pkg = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, '../../package.json'),
        'utf-8',
      ),
    ) as { scripts: { dev: string; 'dev:turbo'?: string } };
    expect(pkg.scripts.dev).toContain('stop-next-dev.mjs');
    expect(pkg.scripts.dev).toContain('--webpack');
    expect(pkg.scripts['dev:turbo']).toBe('next dev');
  });

  test('locale layout rejects unknown locale segments', () => {
    const code = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/layout.tsx'),
      'utf-8',
    );
    expect(code).toContain('hasLocale(routing.locales, locale)');
    expect(code).toMatch(/notFound\(\)/);
  });
});
