import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { buildAnonymizeFunction } from './dom-anonymize.mjs';
import {
  MANIFEST_PATH,
  RAW_DESKTOP,
  RAW_MOBILE,
  STAFF_ALIAS_PATH,
} from './paths.mjs';

const BASE = process.env.SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:3000';
const PIN = process.env.SCREENSHOT_PIN ?? process.env.APP_READ_ONLY_PIN;

if (!PIN || String(PIN).length !== 6) {
  console.error('Set SCREENSHOT_PIN or APP_READ_ONLY_PIN (6 digits) in the environment.');
  process.exit(1);
}

async function loadJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function dismissPostPinPrompts(page) {
  const skip = page.getByRole('button', { name: 'Skip for now' });
  if (await skip.isVisible({ timeout: 4000 }).catch(() => false)) {
    await skip.click();
    await page.waitForTimeout(400);
  }
}

async function ensurePinGateway(page) {
  const pinInput = page.locator('#bb-pin-gateway');
  const needsPin = await pinInput
    .waitFor({ state: 'visible', timeout: 8000 })
    .then(() => true)
    .catch(() => false);

  if (!needsPin) return;

  await pinInput.click();
  await pinInput.fill(String(PIN));
  await page.waitForSelector('main', { timeout: 90000 });
  await dismissPostPinPrompts(page);
}

async function captureShot(page, shot, outDir, viewport, aliasConfig) {
  await page.setViewportSize(viewport);
  await page.goto(`${BASE}${shot.route}`, { waitUntil: 'domcontentloaded' });
  await ensurePinGateway(page);
  await page.waitForSelector(shot.waitSelector, { timeout: 90000 });
  await page.waitForTimeout(shot.openNotificationPanel ? 1200 : 600);

  if (shot.openNotificationPanel) {
    const bell = page.getByRole('button', { name: /การแจ้งเตือน|notification/i }).last();
    await bell.waitFor({ state: 'visible', timeout: 20000 });
    await bell.click();
    await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(400);
  }

  await page.evaluate(buildAnonymizeFunction(aliasConfig));

  const outPath = path.join(outDir, shot.rawFile);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log('saved', outPath);
  return outPath;
}

async function main() {
  const manifest = await loadJson(MANIFEST_PATH);
  const aliasConfig = await loadJson(STAFF_ALIAS_PATH);

  await fs.mkdir(RAW_MOBILE, { recursive: true });
  await fs.mkdir(RAW_DESKTOP, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addInitScript(() => {
    localStorage.setItem('bb-theme', 'light');
  });
  const page = await context.newPage();

  const mobileVp = { width: 390, height: 844 };
  for (const shot of manifest.mobile) {
    console.log('mobile', shot.id);
    await captureShot(page, shot, RAW_MOBILE, mobileVp, aliasConfig);
  }

  const desktopVp = { width: 1280, height: 800 };
  for (const shot of manifest.desktop) {
    console.log('desktop', shot.id);
    await captureShot(page, shot, RAW_DESKTOP, desktopVp, aliasConfig);
  }

  manifest.lastCapture = new Date().toISOString();
  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

  await browser.close();
  console.log('Capture complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
