import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';
import { BRAND_LOGO_INTRINSIC, BRAND_LOGO_SRC } from '@/lib/brand-assets';

const ROOT = path.resolve(__dirname, '..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

const SIDEBAR_LOGO_CONSUMERS = [
  'components/sidebar/Sidebar.tsx',
  'components/sidebar/MobileNavHeader.tsx',
  'components/sidebar/MobileNavDrawer.tsx',
] as const;

describe('Brand logo Next/Image sizing', () => {
  test('intrinsic dimensions match public/images/logo.png', () => {
    const logoPath = path.resolve(ROOT, '../public/images/logo.png');
    const buffer = fs.readFileSync(logoPath);
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    expect(width).toBe(BRAND_LOGO_INTRINSIC.width);
    expect(height).toBe(BRAND_LOGO_INTRINSIC.height);
  });

  test('BrandLogo keeps one display axis auto for aspect ratio', () => {
    const source = readFile('components/sidebar/BrandLogo.tsx');
    expect(source).toContain('BRAND_LOGO_SRC');
    expect(source).toContain('BRAND_LOGO_INTRINSIC.width');
    expect(source).toContain('BRAND_LOGO_INTRINSIC.height');
    expect(source).toMatch(/height:\s*['"]auto['"]/);
    expect(source).not.toMatch(/height:\s*['"][0-9]+px['"]/);
  });

  test('sidebar surfaces use BrandLogo instead of inline logo.png Image', () => {
    for (const relativePath of SIDEBAR_LOGO_CONSUMERS) {
      const source = readFile(relativePath);
      expect(source).toContain('BrandLogo');
      expect(source).not.toContain(BRAND_LOGO_SRC);
    }
  });
});
