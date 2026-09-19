import fs from 'node:fs/promises';
import path from 'node:path';
import { REPO_ROOT } from './paths.mjs';

function parseEnvPins(text) {
  let appPin;
  let readOnlyPin;
  for (const line of text.split('\n')) {
    const full = line.match(/^\s*APP_PIN\s*=\s*"?([0-9]{6})"?/);
    if (full) appPin = full[1];
    const ro = line.match(/^\s*APP_READ_ONLY_PIN\s*=\s*"?([0-9]{6})"?/);
    if (ro) readOnlyPin = ro[1];
  }
  return { appPin, readOnlyPin };
}

/** Prefer full-access APP_PIN so UI is not read-only dimmed (opacity-60). */
export async function resolveScreenshotPin() {
  let filePins = {};
  try {
    const text = await fs.readFile(path.join(REPO_ROOT, '.env.local'), 'utf8');
    filePins = parseEnvPins(text);
  } catch {
    /* no .env.local */
  }

  const appPin = filePins.appPin ?? process.env.APP_PIN;
  const readOnlyPin = filePins.readOnlyPin ?? process.env.APP_READ_ONLY_PIN;

  if (appPin?.length === 6) {
    return { pin: appPin, source: 'APP_PIN', readOnly: false };
  }
  if (process.env.SCREENSHOT_PIN?.length === 6) {
    return { pin: process.env.SCREENSHOT_PIN, source: 'SCREENSHOT_PIN', readOnly: false };
  }
  if (readOnlyPin?.length === 6) {
    return { pin: readOnlyPin, source: 'APP_READ_ONLY_PIN', readOnly: true };
  }

  return null;
}
