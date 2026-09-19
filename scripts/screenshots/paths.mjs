import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const REPO_ROOT = root;
export const MANIFEST_PATH = path.join(root, 'docs/marketing/screenshots/manifest.json');
export const RAW_MOBILE = path.join(root, 'docs/marketing/screenshots/raw/mobile');
export const RAW_DESKTOP = path.join(root, 'docs/marketing/screenshots/raw/desktop');
export const FRAMED_DIR = path.join(root, 'docs/marketing/screenshots/framed');
export const STAFF_ALIAS_PATH = path.join(root, 'scripts/screenshots/staff-alias.json');
export const TEMPLATE_PATH = path.join(root, 'scripts/screenshots/template.html');
