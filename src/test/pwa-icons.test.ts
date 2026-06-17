import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';
import sharp from 'sharp';
import manifest from '@/app/manifest';
import {
  PWA_APPLE_TOUCH_ICON,
  PWA_BRAND_ICON,
  PWA_BRAND_ICON_512,
  PWA_FAVICON,
  PWA_NOTIFICATION_BADGE,
  PWA_NOTIFICATION_ICON,
  buildOsNotificationOptions,
} from '@/lib/pwa-assets';

const ROOT = path.resolve(__dirname, '..', '..');
const ICON = path.join(ROOT, 'public/images/notification-icon.png');

const TRANSPARENT_BRAND_ICON_PATHS = [
  'public/images/notification-icon.png',
  'public/images/notification-icon-512.png',
  'public/images/favicon.png',
  'public/images/apple-touch-icon.png',
  'src/app/icon.png',
  'src/app/apple-icon.png',
] as const;

async function cornerPixels(filePath: string) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];
  return corners.map(([x, y]) => {
    const i = (y * width + x) * 4;
    return { r: data[i], g: data[i + 1], b: data[i + 2], a: data[i + 3] };
  });
}

describe('PWA notification icons', () => {
  test('brand icons use transparent background corners (black mark only)', async () => {
    for (const rel of TRANSPARENT_BRAND_ICON_PATHS) {
      const filePath = path.join(ROOT, rel);
      expect(fs.existsSync(filePath), rel).toBe(true);
      const corners = await cornerPixels(filePath);
      expect(corners.every((px) => px.a < 16), rel).toBe(true);
    }
  });

  test('notification icon is square 192x192', async () => {
    const meta = await sharp(ICON).metadata();
    expect(meta.width).toBe(192);
    expect(meta.height).toBe(192);
  });

  test('legacy notification-badge.png is not used', () => {
    expect(fs.existsSync(path.join(ROOT, 'public/images/notification-badge.png'))).toBe(false);
  });
});

describe('PWA cross-platform asset consistency', () => {
  test('icon and badge constants point to the same brand asset', () => {
    expect(PWA_NOTIFICATION_ICON).toBe(PWA_BRAND_ICON);
    expect(PWA_NOTIFICATION_BADGE).toBe(PWA_BRAND_ICON);
  });

  test('manifest, favicon, and apple-touch icons use shared brand paths', () => {
    const m = manifest();
    const iconSrcs = m.icons?.map((icon) => icon.src) ?? [];
    expect(iconSrcs).toContain(PWA_BRAND_ICON);
    expect(iconSrcs).toContain(PWA_BRAND_ICON_512);
    expect(iconSrcs).toContain(PWA_APPLE_TOUCH_ICON);
    expect(PWA_FAVICON).toBe('/images/favicon.png');
  });

  test('manifest includes stable id for iOS home-screen PWA badging', () => {
    const m = manifest();
    expect(m.id).toBe('/');
    expect(m.display).toBe('standalone');
    expect(m.scope).toBe('/');
  });

  test('OS notification options use identical icon and badge URLs', () => {
    const opts = buildOsNotificationOptions({
      body: 'รับ 2 · คงเหลือ: 0 → 2',
      origin: 'https://blackandbrew.vercel.app',
    });
    expect(opts.icon).toBe('https://blackandbrew.vercel.app/images/notification-icon.png');
    expect(opts.badge).toBe(opts.icon);
  });

  test('service worker and pwa-assets.js reference the same brand icon path', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    const assets = fs.readFileSync(path.join(ROOT, 'public/pwa-assets.js'), 'utf8');
    expect(sw).toContain("importScripts('/pwa-assets.js')");
    expect(sw).toContain("importScripts('/pwa-badge.js')");
    expect(sw).toContain('badge: brandIcon');
    expect(sw).toContain('renotify: true');
    expect(assets).toContain(`"BRAND_ICON": "${PWA_BRAND_ICON}"`);
  });
});
