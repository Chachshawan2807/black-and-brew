/**
 * Regenerate PWA / notification icons from public/images/logo.png.
 * Output: transparent square PNGs (no white letterbox bars).
 */
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const source = path.join(root, 'public/images/logo.png');
const outDir = path.join(root, 'public/images');

async function trimmedLogo() {
  return sharp(source).ensureAlpha().trim({ threshold: 1 });
}

async function writeSquareIcon(trimmed, size, filename, paddingRatio = 0.06) {
  const inner = Math.max(1, Math.round(size * (1 - paddingRatio * 2)));
  const resized = await trimmed
    .clone()
    .resize(inner, inner, { fit: 'inside' })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(outDir, filename));
}

async function main() {
  const trimmed = await trimmedLogo();
  await writeSquareIcon(trimmed, 192, 'notification-icon.png');
  await writeSquareIcon(trimmed, 512, 'notification-icon-512.png');
  await writeSquareIcon(trimmed, 512, 'favicon.png');
  await writeSquareIcon(trimmed, 180, 'apple-touch-icon.png');
  console.log('Generated transparent PWA icons in public/images/');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
