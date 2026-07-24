#!/usr/bin/env node
/**
 * Heuristic scan: src modules never imported via @/ alias (excluding Next entry files).
 */
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const srcRoot = path.join(cwd, 'src');
const exts = new Set(['.ts', '.tsx']);
const routeRe =
  /(?:^|[\\/])(page|layout|route|loading|error|not-found|manifest|default|opengraph-image|icon|apple-icon)\.(ts|tsx)$/;

const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (exts.has(path.extname(entry.name))) files.push(p);
  }
}
walk(srcRoot);

const corpus = files.map((f) => ({
  file: f,
  text: fs.readFileSync(f, 'utf8'),
}));
const testCorpus = fs.existsSync(path.join(srcRoot, 'test'))
  ? fs.readdirSync(path.join(srcRoot, 'test')).map((name) =>
      fs.readFileSync(path.join(srcRoot, 'test', name), 'utf8'),
    )
  : [];

function isImported(relNoExt) {
  const needles = [`'@/${relNoExt}'`, `"@/${relNoExt}"`];
  for (const { text } of corpus) {
    if (needles.some((n) => text.includes(n))) return true;
  }
  for (const text of testCorpus) {
    if (needles.some((n) => text.includes(n))) return true;
  }
  return false;
}

const orphans = [];
for (const file of files) {
  const rel = path.relative(srcRoot, file).replace(/\\/g, '/');
  if (rel.startsWith('test/')) continue;
  if (routeRe.test(file)) continue;
  if (rel === 'proxy.ts') continue;
  const noExt = rel.replace(/\.tsx?$/, '');
  if (!isImported(noExt)) orphans.push(rel);
}

console.log(`Potential orphan modules (${orphans.length}):`);
for (const o of orphans.sort()) console.log(`  - ${o}`);
