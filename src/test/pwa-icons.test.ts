import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';
import sharp from 'sharp';

const ROOT = path.resolve(__dirname, '..', '..');
const ICON = path.join(ROOT, 'public/images/notification-icon.png');

async function cornerAlphas(filePath: string) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [Math.floor(width / 2), 0],
    [Math.floor(width / 2), height - 1],
  ];
  return corners.map(([x, y]) => data[(y * width + x) * 4 + 3]);
}

describe('PWA notification icons', () => {
  test('notification icon exists and has transparent edges (no white letterbox bars)', async () => {
    expect(fs.existsSync(ICON)).toBe(true);
    const alphas = await cornerAlphas(ICON);
    expect(alphas.every((alpha) => alpha < 32)).toBe(true);
  });

  test('notification icon is square 192x192 with alpha channel', async () => {
    const meta = await sharp(ICON).metadata();
    expect(meta.width).toBe(192);
    expect(meta.height).toBe(192);
    expect(meta.hasAlpha).toBe(true);
  });
});
