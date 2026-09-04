import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';
import sharp from 'sharp';
import manifest from '@/app/manifest';
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

async function alphaMarkBounds(filePath: string) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * 4;
      if (data[i + 3] < 16 || data[i] > 8 || data[i + 1] > 8 || data[i + 2] > 8) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  const width = maxX >= minX ? maxX - minX + 1 : 0;
  const height = maxY >= minY ? maxY - minY + 1 : 0;

  return {
    widthRatio: width / info.width,
    heightRatio: height / info.height,
  };
}

describe('Brand logo Next/Image sizing', () => {
  test('intrinsic dimensions match public/images/logo-header.png', () => {
    const logoPath = path.resolve(ROOT, '../public/images/logo-header.png');
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
    expect(source).toContain('bb-brand-logo-box');
    expect(source).toContain('max-h-full');
    expect(source).toContain('max-w-full');
    expect(source).toContain('object-contain');
    expect(source).toContain('unoptimized');
    expect(source).toContain('quality={100}');
    expect(source).toContain('bb-brand-logo');
  });

  test('sidebar surfaces use BrandLogo instead of inline logo.png Image', () => {
    for (const relativePath of SIDEBAR_LOGO_CONSUMERS) {
      const source = readFile(relativePath);
      expect(source).toContain('BrandLogo');
      expect(source).not.toContain(BRAND_LOGO_SRC);
    }
  });

  test('logo-header keeps original canvas padding (in-app scale, not trim-full-bleed)', async () => {
    const logoPath = path.resolve(ROOT, '../public/images/logo-header.png');
    const bounds = await alphaMarkBounds(logoPath);
    expect(bounds.widthRatio).toBeGreaterThan(0.55);
    expect(bounds.widthRatio).toBeLessThan(0.62);
    expect(bounds.heightRatio).toBeGreaterThan(0.40);
    expect(bounds.heightRatio).toBeLessThan(0.5);
  });

  test('PWA splash icons stay on notification-icon paths, not logo-header', () => {
    const iconSrcs = manifest().icons?.map((icon) => icon.src) ?? [];
    expect(iconSrcs).not.toContain(BRAND_LOGO_SRC);
    expect(iconSrcs).toContain('/images/notification-icon-512.png');
    expect(iconSrcs).toContain('/images/notification-icon-1024.png');
  });
});
