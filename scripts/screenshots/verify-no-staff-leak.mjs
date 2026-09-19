import fs from 'node:fs/promises';
import path from 'node:path';
import { FRAMED_DIR, MANIFEST_PATH, RAW_DESKTOP, RAW_MOBILE, STAFF_ALIAS_PATH } from './paths.mjs';

async function collectPngs(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const ent of entries) {
    if (ent.isFile() && ent.name.endsWith('.png') && !ent.name.startsWith('_debug')) {
      files.push(path.join(dir, ent.name));
    }
  }
  return files;
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
  const alias = JSON.parse(await fs.readFile(STAFF_ALIAS_PATH, 'utf8'));
  const realNames = Object.keys(alias.staffNames ?? {});

  const staffRawFiles = new Set(
    [...manifest.mobile, ...manifest.desktop]
      .filter((s) => s.redactMode === 'staff')
      .map((s) => s.rawFile),
  );

  const pngs = [
    ...(await collectPngs(RAW_MOBILE)),
    ...(await collectPngs(RAW_DESKTOP)),
    ...(await collectPngs(FRAMED_DIR)),
  ].filter((file) => {
    const base = path.basename(file);
    if (file.includes(`${path.sep}raw${path.sep}`)) {
      return staffRawFiles.has(base);
    }
    const id = base.replace(/\.png$/, '');
    return manifest.mobile.some((s) => s.id === id && s.redactMode === 'staff');
  });

  if (pngs.length === 0) {
    console.warn('No staff-redacted PNG files to verify.');
    process.exit(0);
  }

  let failed = false;
  for (const file of pngs) {
    const buf = await fs.readFile(file);
    for (const name of realNames) {
      if (buf.includes(Buffer.from(name, 'utf8'))) {
        console.error(`Possible staff name leak "${name}" in ${file}`);
        failed = true;
      }
    }
  }

  if (failed) {
    console.error('Verify failed on staff routes.');
    process.exit(1);
  }

  console.log(`Verified ${pngs.length} staff-route PNG(s) against ${realNames.length} staff names.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
