import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from './paths.mjs';

const SEED_PATH = path.join(REPO_ROOT, 'docs/marketing/screenshots/notification-list.seed.json');
const BUILD_OUT_PATH = path.join(
  REPO_ROOT,
  'docs/marketing/screenshots/.notification-seed-build.json',
);

export async function loadNotificationSeedJson() {
  try {
    const raw = await fs.readFile(SEED_PATH, 'utf8');
    JSON.parse(raw);
    return raw;
  } catch {
    return null;
  }
}

function buildFormattedSeedViaVitest() {
  const vitestBin = path.join(REPO_ROOT, 'node_modules/vitest/vitest.mjs');
  const result = spawnSync(
    process.execPath,
    [vitestBin, 'run', 'src/test/screenshot-notification-seed-export.test.ts'],
    {
      cwd: REPO_ROOT,
      env: { ...process.env, SCREENSHOT_EXPORT_NOTIFICATION_SEED: '1' },
      encoding: 'utf8',
    },
  );

  if (result.status !== 0) {
    return null;
  }

  try {
    const raw = fsSync.readFileSync(BUILD_OUT_PATH, 'utf8');
    JSON.parse(raw);
    void fs.unlink(BUILD_OUT_PATH).catch(() => {});
    return raw;
  } catch {
    return null;
  }
}

export async function resolveNotificationSeedJson() {
  const fromFile = await loadNotificationSeedJson();
  if (fromFile) return { json: fromFile, source: 'file' };

  const fromDb = buildFormattedSeedViaVitest();
  if (fromDb) return { json: fromDb, source: 'supabase-formatted' };

  return null;
}

export async function writeNotificationSeedFromPage(page) {
  const json = await page.evaluate(() => localStorage.getItem('bb-inventory-notifications'));
  if (!json) return false;
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed) || parsed.length === 0) return false;
  } catch {
    return false;
  }
  await fs.mkdir(path.dirname(SEED_PATH), { recursive: true });
  await fs.writeFile(SEED_PATH, json);
  return true;
}
