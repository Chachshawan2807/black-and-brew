import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const exportDir = path.join(root, 'docs/presentation/export');
const printHtml = path.join(root, 'public/presentation/print.html');
const chromePath = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';

async function main() {
  await mkdir(exportDir, { recursive: true });
  await mkdir(path.join(exportDir, 'slides'), { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });

  const fileUrl = `file://${printHtml}`;
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);

  const pdfPath = path.join(exportDir, 'black-and-brew-presentation.pdf');
  await page.pdf({
    path: pdfPath,
    width: '1280px',
    height: '720px',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  const slideCount = await page.$$eval('.slide', (els) => els.length);
  for (let i = 0; i < slideCount; i += 1) {
    const slide = await page.$(`.slide[data-index="${i}"]`);
    if (!slide) continue;
    const num = String(i + 1).padStart(2, '0');
    await slide.screenshot({
      path: path.join(exportDir, 'slides', `slide-${num}.png`),
      type: 'png',
    });
  }

  await browser.close();

  console.log(`PDF: ${pdfPath}`);
  console.log(`Slides: ${slideCount} PNG files in ${path.join(exportDir, 'slides')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
