/**
 * Regenerate PWA / notification icons from public/images/logo.png.
 * Also emits public/pwa-assets.js for the service worker (single source of truth).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'public/images');
const source = fs.existsSync(path.join(outDir, 'logo.png'))
  ? path.join(outDir, 'logo.png')
  : path.join(outDir, 'notification-icon-512.png');

const PWA_ASSETS = {
  BRAND_ICON: '/images/notification-icon.png',
  BRAND_ICON_512: '/images/notification-icon-512.png',
  PUSH_NOTIFICATION_ICON: '/images/push-notification-icon.png',
  NOTIFICATION_BADGE: '/images/notification-badge.png',
  APPLE_TOUCH_ICON: '/images/apple-touch-icon.png',
  FAVICON: '/images/favicon.png',
  MASKABLE_ICON: '/images/maskable-icon-512.png',
  CACHE_VERSION: 18,
  VIBRATE: [120, 60, 120],
};

/** PWA manifest background — baked into launch icons so Android splash never shows black tiles. */
const PWA_SPLASH_BACKGROUND = { r: 247, g: 245, b: 232, alpha: 255 };
/** logo.png ships on a black backdrop — pixels below this luminance become transparent. */
const LOGO_BACKDROP_LUMINANCE_MAX = 32;
/** PWA splash / home-screen — balanced mark size (not a full-bleed block). */
const PWA_ICON_PADDING_RATIO = 0.14;
/** Android maskable safe zone (~80% center circle). */
const PWA_MASKABLE_PADDING_RATIO = 0.2;
/** Android badge: smaller mark + extra padding avoids a solid white blob in the status bar. */
const BADGE_SIZE = 96;
const BADGE_PADDING_RATIO = 0.14;
/** Reject badges that fill too much of the canvas (likely a solid block, not a silhouette). */
const BADGE_MAX_FILL_RATIO = 0.72;

/**
 * logo.png is a dark-gray mark on an opaque black canvas.
 * Drop the backdrop, then silhouette the mark so PWA splash shows the logo on
 * manifest background_color instead of a solid black square.
 */
async function extractLogoMark(image) {
  const { data, info } = await image.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const luminance = Math.max(data[i], data[i + 1], data[i + 2]);
    if (luminance < LOGO_BACKDROP_LUMINANCE_MAX) {
      data[i + 3] = 0;
      continue;
    }
    data[i] = 0;
    data[i + 1] = 0;
    data[i + 2] = 0;
    data[i + 3] = 255;
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  }).png();
}

async function trimmedLogoMark() {
  const mark = await extractLogoMark(sharp(source));
  return mark.trim({ threshold: 1 });
}

async function renderSquareIcon(trimmed, size, paddingRatio = 0.08, background = PWA_SPLASH_BACKGROUND) {
  const inner = Math.max(1, Math.round(size * (1 - paddingRatio * 2)));
  const resized = await trimmed
    .clone()
    .resize(inner, inner, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png({ compressionLevel: 9, adaptiveFiltering: true });
}

async function renderTransparentSquareIcon(trimmed, size, paddingRatio = 0.08) {
  return renderSquareIcon(trimmed, size, paddingRatio, { r: 0, g: 0, b: 0, alpha: 0 });
}

async function writeTransparentSquareIcon(trimmed, size, filename, paddingRatio = 0.08) {
  const image = await renderTransparentSquareIcon(trimmed, size, paddingRatio);
  await image.toFile(path.join(outDir, filename));
}

async function writeSquareIcon(trimmed, size, filename, paddingRatio = 0.08) {
  const image = await renderSquareIcon(trimmed, size, paddingRatio);
  await image.toFile(path.join(outDir, filename));
}

/**
 * Android small-icon / Web Push badge: white silhouette on a fully transparent canvas.
 * Only the alpha channel is used at render time; RGB is conventionally white.
 */
async function renderNotificationBadgeSilhouette(trimmed) {
  const badgeSource = await (await renderTransparentSquareIcon(trimmed, BADGE_SIZE, BADGE_PADDING_RATIO)).toBuffer();
  const { data, info } = await sharp(badgeSource).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 16) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
      continue;
    }
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  }).png({ compressionLevel: 9, adaptiveFiltering: true });
}

async function validateNotificationBadge(filePath) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];

  for (const [x, y] of corners) {
    const alpha = data[(y * width + x) * 4 + 3];
    if (alpha >= 16) {
      throw new Error(`notification-badge corner (${x},${y}) is not transparent`);
    }
  }

  let opaqueCount = 0;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 16) continue;
    opaqueCount += 1;
    if (data[i] < 247 || data[i + 1] < 247 || data[i + 2] < 247) {
      throw new Error('notification-badge opaque pixels must be white (Android silhouette convention)');
    }
  }

  if (opaqueCount < 80) {
    throw new Error(`notification-badge has too few opaque pixels (${opaqueCount})`);
  }

  const fillRatio = opaqueCount / (width * height);
  if (fillRatio > BADGE_MAX_FILL_RATIO) {
    throw new Error(
      `notification-badge fill ratio ${fillRatio.toFixed(2)} exceeds ${BADGE_MAX_FILL_RATIO} — likely a solid block`,
    );
  }
}

async function writeNotificationBadge(trimmed) {
  const badge = await renderNotificationBadgeSilhouette(trimmed);
  const outputPath = path.join(outDir, 'notification-badge.png');
  await badge.toFile(outputPath);
  await validateNotificationBadge(outputPath);
}

async function writeNextAppIcons(trimmed) {
  const appDir = path.join(root, 'src/app');
  await (await renderSquareIcon(trimmed, 512, PWA_ICON_PADDING_RATIO)).toFile(path.join(appDir, 'icon.png'));
  await (await renderSquareIcon(trimmed, 180, PWA_ICON_PADDING_RATIO)).toFile(path.join(appDir, 'apple-icon.png'));
  await (await renderSquareIcon(trimmed, 32, 0.06)).toFile(path.join(appDir, 'favicon.ico'));
}

function writePwaAssetsJs() {
  const content = `// AUTO-GENERATED by scripts/generate-pwa-icons.mjs — do not edit by hand.
self.PWA_ASSETS = ${JSON.stringify(PWA_ASSETS, null, 2)};
`;
  fs.writeFileSync(path.join(root, 'public/pwa-assets.js'), content, 'utf8');
}

async function main() {
  const trimmed = await trimmedLogoMark();

  await writeSquareIcon(trimmed, 192, 'notification-icon.png', PWA_ICON_PADDING_RATIO);
  await writeTransparentSquareIcon(trimmed, 192, 'push-notification-icon.png', PWA_ICON_PADDING_RATIO);
  await writeNotificationBadge(trimmed);
  await writeSquareIcon(trimmed, 512, 'notification-icon-512.png', PWA_ICON_PADDING_RATIO);
  await writeSquareIcon(trimmed, 512, 'maskable-icon-512.png', PWA_MASKABLE_PADDING_RATIO);
  await writeSquareIcon(trimmed, 512, 'favicon.png', PWA_ICON_PADDING_RATIO);
  await writeSquareIcon(trimmed, 180, 'apple-touch-icon.png', PWA_ICON_PADDING_RATIO);
  await writeNextAppIcons(trimmed);
  writePwaAssetsJs();

  console.log('Generated PWA icons + public/pwa-assets.js');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
