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

const PWA_ASSETS_STATIC = {
  BRAND_ICON: '/images/notification-icon.png',
  BRAND_ICON_512: '/images/notification-icon-512.png',
  BRAND_ICON_1024: '/images/notification-icon-1024.png',
  PUSH_NOTIFICATION_ICON: '/images/push-notification-icon.png',
  NOTIFICATION_BADGE: '/images/notification-badge.png',
  APPLE_TOUCH_ICON: '/images/apple-touch-icon.png',
  FAVICON: '/images/favicon.png',
  MASKABLE_ICON: '/images/maskable-icon-512.png',
  VIBRATE: [120, 60, 120],
};

/** Read current CACHE_VERSION from public/pwa-assets.js so regen never downgrades the SW cache. */
function readExistingCacheVersion() {
  const assetsPath = path.join(root, 'public/pwa-assets.js');
  if (!fs.existsSync(assetsPath)) return 0;
  const content = fs.readFileSync(assetsPath, 'utf8');
  const match = content.match(/"CACHE_VERSION"\s*:\s*(\d+)/);
  return match ? Number(match[1]) : 0;
}

function buildPwaAssets(cacheVersion) {
  return { ...PWA_ASSETS_STATIC, CACHE_VERSION: cacheVersion };
}

/** PWA manifest background baked into launch icons so Android splash never shows black tiles. */
const PWA_SPLASH_BACKGROUND = { r: 247, g: 245, b: 232, alpha: 255 };
/**
 * logo.png is a near-black mark (peak ~34–36) on pure black.
 * Soft-ramp alpha between these luminances keeps anti-aliased edges for splash.
 * Binary thresholding here used to create jagged black↔cream stair-steps on Android.
 */
const LOGO_BACKDROP_LUMINANCE_MAX = 8;
const LOGO_MARK_OPAQUE_LUMINANCE = 34;
/** PWA splash / home-screen balanced mark size (not a full-bleed block). */
const PWA_ICON_PADDING_RATIO = 0.14;
/** In-app header/sidebar only. PWA launch icons keep trimmed mark + PWA_ICON_PADDING_RATIO above. */
/** Supersample factor before downscale: higher = sharper text on high-DPI splash screens. */
const PWA_ICON_SUPER_SAMPLE = 4;
/** Sidebar/mobile header max CSS width is 240px; 3× gives crisp marks on high-DPI screens. */
const HEADER_LOGO_CSS_MAX_WIDTH = 240;
const HEADER_LOGO_DEVICE_PIXEL_RATIO = 3;
const HEADER_LOGO_SUPER_SAMPLE = 4;
/** Android maskable safe zone (~80% center circle). */
const PWA_MASKABLE_PADDING_RATIO = 0.2;
/** Legacy square launch icon mark height (keeps PWA splash scale with icon-only sources). */
const LEGACY_PWA_SQUARE_MARK_HEIGHT_RATIO = 0.465;
/** Legacy header canvas from original wordmark logo.png (keeps in-app visual scale). */
const LEGACY_HEADER_ASPECT = 1783 / 1484;
const LEGACY_MARK_WIDTH_RATIO = 1037 / 1783;
const LEGACY_MARK_HEIGHT_RATIO = 670 / 1484;
/** Android badge: smaller mark + extra padding avoids a solid white blob in the status bar. */
const BADGE_SIZE = 96;
const BADGE_PADDING_RATIO = 0.14;
/** Reject badges that fill too much of the canvas (likely a solid block, not a silhouette). */
const BADGE_MAX_FILL_RATIO = 0.72;

/**
 * Normalise logo.png to a pure-black silhouette on transparent canvas.
 * Supports legacy near-black-on-black sources and modern transparent PNG exports.
 */
async function extractLogoMark(image) {
  const { data, info } = await image.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const ramp = LOGO_MARK_OPAQUE_LUMINANCE - LOGO_BACKDROP_LUMINANCE_MAX;
  const cornerAlphas = [
    data[3],
    data[(info.width - 1) * 4 + 3],
    data[((info.height - 1) * info.width) * 4 + 3],
    data[((info.height - 1) * info.width + info.width - 1) * 4 + 3],
  ];
  const usesSourceAlpha = cornerAlphas.every((alpha) => alpha < 16);

  for (let i = 0; i < data.length; i += 4) {
    let alpha = 0;

    if (usesSourceAlpha) {
      const sourceAlpha = data[i + 3];
      if (sourceAlpha >= 16) {
        alpha = Math.min(255, Math.round(255 * Math.pow(sourceAlpha / 255, 0.85)));
      }
    } else {
      const luminance = Math.max(data[i], data[i + 1], data[i + 2]);
      if (luminance > LOGO_BACKDROP_LUMINANCE_MAX) {
        if (luminance >= LOGO_MARK_OPAQUE_LUMINANCE) {
          alpha = 255;
        } else {
          alpha = Math.round(((luminance - LOGO_BACKDROP_LUMINANCE_MAX) / ramp) * 255);
          alpha = Math.min(255, Math.round(255 * Math.pow(alpha / 255, 0.72)));
        }
      }
    }

    data[i] = 0;
    data[i + 1] = 0;
    data[i + 2] = 0;
    data[i + 3] = alpha;
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
  const trimmed = await mark.trim({ threshold: 1 }).png().toBuffer();
  return sharp(trimmed);
}

async function renderSquareIcon(trimmed, size, paddingRatio = 0.08, background = PWA_SPLASH_BACKGROUND) {
  const renderSize = size * PWA_ICON_SUPER_SAMPLE;
  const inner = Math.max(1, Math.round(renderSize * (1 - paddingRatio * 2)));
  const legacyMarkH = Math.max(
    1,
    Math.round(size * LEGACY_PWA_SQUARE_MARK_HEIGHT_RATIO * PWA_ICON_SUPER_SAMPLE),
  );
  const tmeta = await trimmed.metadata();
  const scale = Math.min(legacyMarkH / tmeta.height, inner / tmeta.width, inner / tmeta.height);
  const resized = await trimmed
    .clone()
    .resize(
      Math.max(1, Math.round(tmeta.width * scale)),
      Math.max(1, Math.round(tmeta.height * scale)),
      {
        kernel: sharp.kernel.lanczos3,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    )
    .png()
    .toBuffer();

  const large = await sharp({
    create: {
      width: renderSize,
      height: renderSize,
      channels: 4,
      background,
    },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toBuffer();

  return sharp(large)
    .resize(size, size, { kernel: sharp.kernel.lanczos3 })
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
      `notification-badge fill ratio ${fillRatio.toFixed(2)} exceeds ${BADGE_MAX_FILL_RATIO} likely a solid block`,
    );
  }
}

async function writeNotificationBadge(trimmed) {
  const badge = await renderNotificationBadgeSilhouette(trimmed);
  const outputPath = path.join(outDir, 'notification-badge.png');
  await badge.toFile(outputPath);
  await validateNotificationBadge(outputPath);
}

/**
 * Header/sidebar brand mark: pure-black silhouette on transparent canvas.
 * Re-centre trimmed mark on the legacy header canvas so CSS boxes keep the same visual scale.
 * Do not use for PWA splash; launch icons use trimmed mark + PWA_ICON_PADDING_RATIO.
 */
async function buildLegacyHeaderCanvas(trimmed, canvasWidth, canvasHeight) {
  const markTargetW = Math.max(1, Math.round(canvasWidth * LEGACY_MARK_WIDTH_RATIO));
  const markTargetH = Math.max(1, Math.round(canvasHeight * LEGACY_MARK_HEIGHT_RATIO));
  const tmeta = await trimmed.metadata();
  const scale = Math.min(markTargetW / tmeta.width, markTargetH / tmeta.height);
  const resized = await trimmed
    .clone()
    .resize(Math.max(1, Math.round(tmeta.width * scale)), Math.max(1, Math.round(tmeta.height * scale)), {
      kernel: sharp.kernel.lanczos3,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite([{ input: resized, gravity: 'center' }]);
}

async function writeHeaderLogo() {
  const trimmed = await trimmedLogoMark();
  const targetWidth = HEADER_LOGO_CSS_MAX_WIDTH * HEADER_LOGO_DEVICE_PIXEL_RATIO;
  const targetHeight = Math.round(targetWidth / LEGACY_HEADER_ASPECT);
  const renderWidth = targetWidth * HEADER_LOGO_SUPER_SAMPLE;
  const renderHeight = Math.round(renderWidth / LEGACY_HEADER_ASPECT);

  const largeBuffer = await (
    await buildLegacyHeaderCanvas(trimmed, renderWidth, renderHeight)
  )
    .png()
    .toBuffer();

  await sharp(largeBuffer)
    .resize(targetWidth, targetHeight, { kernel: sharp.kernel.lanczos3 })
    .sharpen({ sigma: 0.55, m1: 0.5, m2: 0.25 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(outDir, 'logo-header.png'));
}

async function writeNextAppIcons(trimmed) {
  const appDir = path.join(root, 'src/app');
  await (await renderSquareIcon(trimmed, 512, PWA_ICON_PADDING_RATIO)).toFile(path.join(appDir, 'icon.png'));
  await (await renderSquareIcon(trimmed, 180, PWA_ICON_PADDING_RATIO)).toFile(path.join(appDir, 'apple-icon.png'));
  await (await renderSquareIcon(trimmed, 32, 0.06)).toFile(path.join(appDir, 'favicon.ico'));
}

function writePwaAssetsJs(pwaAssets) {
  const content = `// AUTO-GENERATED by scripts/generate-pwa-icons.mjs do not edit by hand.
self.PWA_ASSETS = ${JSON.stringify(pwaAssets, null, 2)};
`;
  fs.writeFileSync(path.join(root, 'public/pwa-assets.js'), content, 'utf8');
}

async function main() {
  const trimmed = await trimmedLogoMark();

  await writeSquareIcon(trimmed, 192, 'notification-icon.png', PWA_ICON_PADDING_RATIO);
  await writeTransparentSquareIcon(trimmed, 192, 'push-notification-icon.png', PWA_ICON_PADDING_RATIO);
  await writeNotificationBadge(trimmed);
  await writeSquareIcon(trimmed, 512, 'notification-icon-512.png', PWA_ICON_PADDING_RATIO);
  await writeSquareIcon(trimmed, 1024, 'notification-icon-1024.png', PWA_ICON_PADDING_RATIO);
  await writeSquareIcon(trimmed, 512, 'maskable-icon-512.png', PWA_MASKABLE_PADDING_RATIO);
  await writeSquareIcon(trimmed, 512, 'favicon.png', PWA_ICON_PADDING_RATIO);
  await writeSquareIcon(trimmed, 180, 'apple-touch-icon.png', PWA_ICON_PADDING_RATIO);
  await writeHeaderLogo();
  await writeNextAppIcons(trimmed);
  const cacheVersion = readExistingCacheVersion() + 1;
  const pwaAssets = buildPwaAssets(cacheVersion);
  writePwaAssetsJs(pwaAssets);

  console.log(`Generated PWA icons + public/pwa-assets.js (CACHE_VERSION=${cacheVersion})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
