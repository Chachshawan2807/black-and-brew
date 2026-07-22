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
  NOTIFICATION_BADGE: '/images/notification-badge.png',
  APPLE_TOUCH_ICON: '/images/apple-touch-icon.png',
  FAVICON: '/images/favicon.png',
  CACHE_VERSION: 13,
  VIBRATE: [120, 60, 120],
};

/** Transparent canvas — black logo mark only (all platforms). */
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
/** Minimal padding — logo uses cover fit so wide marks still fill splash height. */
const SPLASH_ICON_PADDING_RATIO = 0.035;
/** Android badge: smaller mark + extra padding avoids a solid white blob in the status bar. */
const BADGE_SIZE = 96;
const BADGE_PADDING_RATIO = 0.14;
/** Reject badges that fill too much of the canvas (likely a solid block, not a silhouette). */
const BADGE_MAX_FILL_RATIO = 0.72;

async function trimmedLogo() {
  return sharp(source).ensureAlpha().trim({ threshold: 1 });
}

async function blackSilhouette(image) {
  const { data, info } = await image.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    data[i] = 0;
    data[i + 1] = 0;
    data[i + 2] = 0;
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  }).png();
}

async function renderSquareIcon(trimmed, size, paddingRatio = 0.08) {
  const inner = Math.max(1, Math.round(size * (1 - paddingRatio * 2)));
  const resized = await trimmed
    .clone()
    .resize(inner, inner, { fit: 'inside', background: TRANSPARENT })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: TRANSPARENT,
    },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png({ compressionLevel: 9, adaptiveFiltering: true });
}

/** PWA / OS splash icons — cover fill so wide logos stay large on square canvases. */
async function renderSplashIcon(trimmed, size, paddingRatio = SPLASH_ICON_PADDING_RATIO) {
  const inner = Math.max(1, Math.round(size * (1 - paddingRatio * 2)));
  const resized = await trimmed
    .clone()
    .resize(inner, inner, { fit: 'cover', position: 'center' })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: TRANSPARENT,
    },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png({ compressionLevel: 9, adaptiveFiltering: true });
}

async function writeSquareIcon(trimmed, size, filename, paddingRatio = 0.08) {
  const image = await renderSquareIcon(trimmed, size, paddingRatio);
  await image.toFile(path.join(outDir, filename));
}

async function writeSplashIcon(trimmed, size, filename, paddingRatio = SPLASH_ICON_PADDING_RATIO) {
  const image = await renderSplashIcon(trimmed, size, paddingRatio);
  await image.toFile(path.join(outDir, filename));
}

/**
 * Android small-icon / Web Push badge: white silhouette on a fully transparent canvas.
 * Only the alpha channel is used at render time; RGB is conventionally white.
 */
async function renderNotificationBadgeSilhouette(trimmed) {
  const badgeSource = await (await renderSquareIcon(trimmed, BADGE_SIZE, BADGE_PADDING_RATIO)).toBuffer();
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
  await (await renderSplashIcon(trimmed, 512)).toFile(path.join(appDir, 'icon.png'));
  await (await renderSplashIcon(trimmed, 180)).toFile(path.join(appDir, 'apple-icon.png'));
  await (await renderSquareIcon(trimmed, 32, 0.06)).toFile(path.join(appDir, 'favicon.ico'));
}

function writePwaAssetsJs() {
  const content = `// AUTO-GENERATED by scripts/generate-pwa-icons.mjs — do not edit by hand.
self.PWA_ASSETS = ${JSON.stringify(PWA_ASSETS, null, 2)};
`;
  fs.writeFileSync(path.join(root, 'public/pwa-assets.js'), content, 'utf8');
}

async function main() {
  const trimmed = await trimmedLogo();
  const blackTrimmed = await blackSilhouette(trimmed);

  await writeSplashIcon(blackTrimmed, 192, 'notification-icon.png');
  await writeNotificationBadge(blackTrimmed);
  await writeSplashIcon(blackTrimmed, 512, 'notification-icon-512.png');
  await writeSquareIcon(trimmed, 512, 'favicon.png');
  await writeSplashIcon(trimmed, 180, 'apple-touch-icon.png');
  await writeNextAppIcons(trimmed);
  writePwaAssetsJs();

  console.log('Generated PWA icons + public/pwa-assets.js');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
