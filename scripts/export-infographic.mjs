import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const exportDir = path.join(root, 'docs/presentation/export');
const publicExportDir = path.join(root, 'public/presentation/export');
const htmlPath = path.join(root, 'public/presentation/infographic.html');
const chromePath = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';

async function main() {
  await mkdir(exportDir, { recursive: true });
  await mkdir(publicExportDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForSelector('#infographic', { timeout: 10000 });

  const infographic = await page.$('#infographic');
  if (!infographic) throw new Error('Infographic element not found');

  const pngPath = path.join(exportDir, 'black-and-brew-infographic.png');
  const publicPngPath = path.join(publicExportDir, 'black-and-brew-infographic.png');

  await infographic.screenshot({ path: pngPath, type: 'png' });
  await infographic.screenshot({ path: publicPngPath, type: 'png' });

  const pdfPath = path.join(exportDir, 'black-and-brew-infographic.pdf');
  const publicPdfPath = path.join(publicExportDir, 'black-and-brew-infographic.pdf');
  const box = await infographic.boundingBox();

  await page.pdf({
    path: pdfPath,
    width: `${Math.ceil(box.width)}px`,
    height: `${Math.ceil(box.height)}px`,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  await page.pdf({
    path: publicPdfPath,
    width: `${Math.ceil(box.width)}px`,
    height: `${Math.ceil(box.height)}px`,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  await browser.close();

  console.log(`PNG: ${pngPath}`);
  console.log(`PDF: ${pdfPath}`);
  console.log(`Size: ${Math.ceil(box.width)}×${Math.ceil(box.height)}px`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
