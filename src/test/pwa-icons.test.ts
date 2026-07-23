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
  PWA_MASKABLE_ICON,
  PWA_NOTIFICATION_BADGE,
  PWA_NOTIFICATION_ICON,
  buildOsNotificationOptions,
} from '@/lib/pwa-assets';

const ROOT = path.resolve(__dirname, '..', '..');
const ICON = path.join(ROOT, 'public/images/notification-icon.png');
const BADGE = path.join(ROOT, 'public/images/notification-badge.png');

const TRANSPARENT_BRAND_ICON_PATHS = [
  'public/images/notification-badge.png',
] as const;

const PWA_SPLASH_BACKGROUND_RGB = { r: 247, g: 245, b: 232 };

const PWA_LAUNCH_ICON_PATHS = [
  'public/images/notification-icon.png',
  'public/images/notification-icon-512.png',
  'public/images/maskable-icon-512.png',
  'public/images/favicon.png',
  'public/images/apple-touch-icon.png',
  'src/app/icon.png',
  'src/app/apple-icon.png',
] as const;

const BLACK_NOTIFICATION_ICON_PATHS = [
  'public/images/notification-icon.png',
  'public/images/notification-icon-512.png',
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

async function cornersMatchBackground(filePath: string, bg: { r: number; g: number; b: number }) {
  const corners = await cornerPixels(filePath);
  return corners.every(
    (px) =>
      px.a >= 247 &&
      Math.abs(px.r - bg.r) <= 4 &&
      Math.abs(px.g - bg.g) <= 4 &&
      Math.abs(px.b - bg.b) <= 4,
  );
}
async function opaquePixelsAreBlack(filePath: string) {
  const { data } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let blackCount = 0;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 16) continue;
    if (data[i] > 8 || data[i + 1] > 8 || data[i + 2] > 8) continue;
    blackCount += 1;
  }
  return blackCount > 100;
}

async function opaquePixelsAreWhite(filePath: string) {
  const { data } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let opaqueCount = 0;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 16) continue;
    opaqueCount += 1;
    if (data[i] < 247 || data[i + 1] < 247 || data[i + 2] < 247) return false;
  }
  return opaqueCount > 80;
}

async function badgeFillRatio(filePath: string) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let opaqueCount = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] >= 16) opaqueCount += 1;
  }
  return opaqueCount / (info.width * info.height);
}

function isBrandMarkPixel(r: number, g: number, b: number, a: number) {
  return a >= 16 && r <= 8 && g <= 8 && b <= 8;
}

async function visiblePixelBounds(filePath: string) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * 4;
      if (!isBrandMarkPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  const width = maxX >= minX ? maxX - minX + 1 : 0;
  const height = maxY >= minY ? maxY - minY + 1 : 0;

  return {
    centerX: (minX + maxX + 1) / 2 / info.width,
    centerY: (minY + maxY + 1) / 2 / info.height,
    widthRatio: width / info.width,
    heightRatio: height / info.height,
  };
}

describe('PWA notification icons', () => {
  test('notification badge uses transparent background corners', async () => {
    for (const rel of TRANSPARENT_BRAND_ICON_PATHS) {
      const filePath = path.join(ROOT, rel);
      expect(fs.existsSync(filePath), rel).toBe(true);
      const corners = await cornerPixels(filePath);
      expect(corners.every((px) => px.a < 16), rel).toBe(true);
    }
  });

  test('PWA launch icons bake in manifest splash background at corners', async () => {
    for (const rel of PWA_LAUNCH_ICON_PATHS) {
      const filePath = path.join(ROOT, rel);
      expect(fs.existsSync(filePath), rel).toBe(true);
      expect(await cornersMatchBackground(filePath, PWA_SPLASH_BACKGROUND_RGB), rel).toBe(true);
    }
  });

  test('notification icons include a black brand mark on the splash background', async () => {
    for (const rel of BLACK_NOTIFICATION_ICON_PATHS) {
      expect(await opaquePixelsAreBlack(path.join(ROOT, rel)), rel).toBe(true);
    }
  });

  test('notification icon is square 192x192', async () => {
    const meta = await sharp(ICON).metadata();
    expect(meta.width).toBe(192);
    expect(meta.height).toBe(192);
  });

  test('PWA launch icons keep the full brand mark centered without cover cropping', async () => {
    for (const rel of ['public/images/notification-icon.png', 'public/images/notification-icon-512.png'] as const) {
      const bounds = await visiblePixelBounds(path.join(ROOT, rel));
      expect(bounds.centerX, rel).toBeGreaterThan(0.47);
      expect(bounds.centerX, rel).toBeLessThan(0.53);
      expect(bounds.centerY, rel).toBeGreaterThan(0.47);
      expect(bounds.centerY, rel).toBeLessThan(0.53);
      expect(bounds.widthRatio, rel).toBeGreaterThan(0.68);
      expect(bounds.widthRatio, rel).toBeLessThan(0.86);
      expect(bounds.heightRatio, rel).toBeGreaterThan(0.44);
      expect(bounds.heightRatio, rel).toBeLessThan(0.58);
      expect(bounds.widthRatio / bounds.heightRatio, rel).toBeGreaterThan(1.35);
    }
  });

  test('maskable icon keeps extra safe-zone padding for Android adaptive icons', async () => {
    const bounds = await visiblePixelBounds(path.join(ROOT, 'public/images/maskable-icon-512.png'));
    expect(bounds.widthRatio).toBeGreaterThan(0.52);
    expect(bounds.widthRatio).toBeLessThan(0.66);
    expect(bounds.heightRatio).toBeGreaterThan(0.32);
    expect(bounds.heightRatio).toBeLessThan(0.44);
  });

  test('notification badge is white silhouette mask sized for mobile OS badges', async () => {
    const meta = await sharp(BADGE).metadata();
    expect(meta.width).toBe(96);
    expect(meta.height).toBe(96);
    expect(await opaquePixelsAreWhite(BADGE)).toBe(true);
    expect(await badgeFillRatio(BADGE)).toBeLessThan(0.72);
  });
});

describe('PWA cross-platform asset consistency', () => {
  test('notification icon and badge use separate mobile OS assets', () => {
    expect(PWA_NOTIFICATION_ICON).toBe(PWA_BRAND_ICON);
    expect(PWA_NOTIFICATION_BADGE).toBe('/images/notification-badge.png');
  });

  test('manifest, favicon, and apple-touch icons use shared brand paths', () => {
    const m = manifest();
    const iconSrcs = m.icons?.map((icon) => icon.src) ?? [];
    expect(iconSrcs).toContain(PWA_BRAND_ICON);
    expect(iconSrcs).toContain(PWA_BRAND_ICON_512);
    expect(iconSrcs).toContain(PWA_MASKABLE_ICON);
    expect(iconSrcs).toContain(PWA_APPLE_TOUCH_ICON);
    expect(PWA_FAVICON).toBe('/images/favicon.png');
  });

  test('manifest uses lowercase English app name', () => {
    const m = manifest();
    expect(m.name).toBe('blackandbrew');
    expect(m.short_name).toBe('blackandbrew');
  });

  test('manifest includes stable id for iOS home-screen PWA badging', () => {
    const m = manifest();
    expect(m.id).toBe('/');
    expect(m.start_url).toBe('/th?utm_source=pwa');
    expect(m.display).toBe('standalone');
    expect(m.scope).toBe('/');
  });

  test('OS notification options use separate icon and badge URLs', () => {
    const opts = buildOsNotificationOptions({
      body: 'รับ 2 · คงเหลือ: 0 → 2',
      origin: 'https://blackandbrew.vercel.app',
    });
    expect(opts.icon).toBe('https://blackandbrew.vercel.app/images/notification-icon.png');
    expect(opts.badge).toBe('https://blackandbrew.vercel.app/images/notification-badge.png');
  });

  test('service worker and pwa-assets.js reference the notification badge path', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
    const assets = fs.readFileSync(path.join(ROOT, 'public/pwa-assets.js'), 'utf8');
    expect(sw).toContain("importScripts('/pwa-assets.js')");
    expect(sw).toContain("importScripts('/pwa-badge.js')");
    expect(sw).toContain('resolvePushAssets');
    expect(sw).toContain('buildNotificationOptions');
    expect(sw).toContain('payload.assets?.icon');
    expect(sw).toContain('payload.assets?.badge');
    expect(sw).toContain('renotify: true');
    expect(assets).toContain(`"BRAND_ICON": "${PWA_BRAND_ICON}"`);
    expect(assets).toContain(`"NOTIFICATION_BADGE": "${PWA_NOTIFICATION_BADGE}"`);
  });

  test('PWA registration refreshes background push for daily reports too', () => {
    const source = fs.readFileSync(path.join(ROOT, 'src/components/PwaRegister.tsx'), 'utf8');
    expect(source).toContain('wantsPushRegistration(prefs)');
    expect(source).toContain('schedulePushSubscriptionMaintenance');
    expect(source).toContain('pageshow');
    expect(source).not.toContain('prefs.enabled && prefs.systemNotifications');
  });
});
