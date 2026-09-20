import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { buildScreenshotNotificationSeedJson } from '../../scripts/screenshots/format-catch-up-notifications';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_PATH = path.join(REPO_ROOT, 'docs/marketing/screenshots/.notification-seed-build.json');

describe('export notification seed for Playwright capture', () => {
  test('writes formatted catch-up JSON when SCREENSHOT_EXPORT_NOTIFICATION_SEED=1', async () => {
    if (process.env.SCREENSHOT_EXPORT_NOTIFICATION_SEED !== '1') {
      return;
    }

    const json = await buildScreenshotNotificationSeedJson();
    expect(json).toBeTruthy();
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, json!);
  });
});
