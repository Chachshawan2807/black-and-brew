import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { FRAMED_DIR, MANIFEST_PATH, RAW_MOBILE, TEMPLATE_PATH } from './paths.mjs';

async function main() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
  const template = await fs.readFile(TEMPLATE_PATH, 'utf8');
  await fs.mkdir(FRAMED_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const shot of manifest.mobile) {
    const rawPath = path.join(RAW_MOBILE, shot.rawFile);
    try {
      await fs.access(rawPath);
    } catch {
      console.error(`Missing raw file: ${rawPath}. Run npm run screenshots:capture first.`);
      process.exit(1);
    }
    const buf = await fs.readFile(rawPath);
    const dataUrl = `data:image/png;base64,${buf.toString('base64')}`;
    const html = template
      .replace('{{HEADLINE}}', shot.headline)
      .replace('{{SCREENSHOT_DATA_URL}}', dataUrl);
    await page.setContent(html, { waitUntil: 'load' });

    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    // Tall full-page mobile raws (e.g. inventory grid) must not be clipped in framed output.
    const height = Math.min(Math.max(bodyHeight + 40, 1200), 40000);
    await page.setViewportSize({ width: 1080, height });

    const outPath = path.join(FRAMED_DIR, `${shot.id}.png`);
    await page.screenshot({ path: outPath, fullPage: true });
    console.log('framed', outPath);
  }

  await browser.close();
  console.log('Compose complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
