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
    expect(code).toContain("pathname.startsWith('/en/')");
    expect(code).toMatch(/\/th\$\{pathname\.slice\(3\)\}/);
  });
});
