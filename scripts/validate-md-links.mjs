#!/usr/bin/env node
/**
 * Validate relative links in project-owned markdown (excludes .agents/, .agent-skills/).
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const skipDirs = new Set(['node_modules', '.next', '.git', '.agents', '.agent-skills', '.cursor']);
const projectMd = [];

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (skipDirs.has(e.name)) continue;
      walk(p);
    } else if (e.name.endsWith('.md')) {
      const rel = path.relative(root, p).replace(/\\/g, '/');
      if (rel.startsWith('.agents/') || rel.startsWith('.agent-skills/')) continue;
      projectMd.push(p);
    }
  }
}

walk(root);

const linkRe = /\[([^\]]*)\]\(([^)]+)\)/g;
const broken = [];

for (const file of projectMd) {
  const text = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);
  let m;
  while ((m = linkRe.exec(text))) {
    const target = m[2].trim();
    if (!target || /^https?:/i.test(target) || target.startsWith('#') || target.startsWith('mailto:')) {
      continue;
    }
    const clean = target.split('#')[0].split('?')[0];
    if (!clean) continue;
    const resolved = path.resolve(dir, clean);
    if (!fs.existsSync(resolved)) {
      broken.push({ from: path.relative(root, file).replace(/\\/g, '/'), link: target });
    }
  }
}

console.log(`Project MD files: ${projectMd.length}`);
console.log(`Broken links: ${broken.length}`);
for (const b of broken) {
  console.log(`  ${b.from} -> ${b.link}`);
}

process.exit(broken.length > 0 ? 1 : 0);
