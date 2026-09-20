#!/usr/bin/env node
/**
 * ERP design-review pre-pass: workflow reminder + lightweight anti-pattern scan.
 * Full review still requires agents to run web-design-guidelines + impeccable critique.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../../../');

const HELP = `Usage: design-review.mjs [--target <file-or-dir>] [--help]

Runs a lightweight scan for common Web Interface Guidelines anti-patterns.
Agents must still complete web-design-guidelines + impeccable critique + ui-ux-pro-max-erp.
`;

const RULES = [
  {
    id: 'outline-none-without-replacement',
    test: (content, file) => {
      const lines = content.split('\n');
      const hits = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.includes('outline-none')) continue;
        const window = lines.slice(i, Math.min(i + 3, lines.length)).join('\n');
        if (!window.includes('focus-visible')) {
          hits.push({ file, line: i + 1, msg: 'outline-none without focus-visible replacement nearby' });
        }
      }
      return hits;
    },
  },
  {
    id: 'transition-all',
    test: (content, file) => {
      const hits = [];
      content.split('\n').forEach((line, i) => {
        if (line.includes('transition-all')) {
          hits.push({ file, line: i + 1, msg: 'transition-all → list explicit properties' });
        }
      });
      return hits;
    },
  },
  {
    id: 'disable-zoom',
    test: (content, file) => {
      const hits = [];
      if (/user-scalable=no|maximum-scale=1/.test(content)) {
        hits.push({ file, line: 1, msg: 'viewport disables zoom' });
      }
      return hits;
    },
  },
  {
    id: 'icon-button-aria',
    test: (content, file) => {
      const hits = [];
      const buttonBlocks = content.matchAll(
        /<button[\s\S]*?<\/button>/g,
      );
      for (const match of buttonBlocks) {
        const block = match[0];
        if (!/<[A-Z][a-zA-Z]*\s/.test(block)) continue;
        if (block.includes('aria-label') || block.includes('aria-labelledby')) continue;
        if (/<span[\s>]/.test(block)) continue;
        if (block.includes('role="switch"')) continue;
        if (
          /\{[^}]*(isTh|biometricLabels|moreLabel|lessLabel|registering|t\.)/.test(block) ||
          /[?'"][^?'"]{2,}[?'"]/.test(block)
        ) {
          continue;
        }
        const line = content.slice(0, match.index).split('\n').length;
        hits.push({ file, line, msg: 'button with icon child missing aria-label' });
      }
      return hits;
    },
  },
];

function collectFilesAbs(absPath) {
  const st = statSync(absPath);
  if (st.isFile()) {
    if (!/\.(tsx|ts|jsx|js)$/.test(absPath)) return [];
    return [absPath];
  }
  const out = [];
  for (const name of readdirSync(absPath)) {
    const child = join(absPath, name);
    const childSt = statSync(child);
    if (childSt.isDirectory()) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      out.push(...collectFilesAbs(child));
    } else if (/\.(tsx|ts|jsx|js)$/.test(name)) {
      out.push(child);
    }
  }
  return out;
}

function collectFiles(targetPath) {
  return collectFilesAbs(resolve(REPO_ROOT, targetPath));
}

function rel(p) {
  return p.replace(REPO_ROOT + '\\', '').replace(REPO_ROOT + '/', '');
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(HELP);
    process.exit(0);
  }

  const targetIdx = args.indexOf('--target');
  const targets =
    targetIdx >= 0 && args[targetIdx + 1]
      ? [args[targetIdx + 1]]
      : ['src/components', 'src/app/[locale]/settings'];

  console.log('\nDesign review workflow (ERP):');
  console.log('  1. web-design-guidelines → fetch command.md + file:line report');
  console.log('  2. impeccable critique → Operate mode, critique only');
  console.log('  3. ui-ux-pro-max-erp → --domain ux / --stack shadcn|nextjs');
  console.log('  Overlay: .cursor/skills/ui-ux-pro-max-erp/SKILL.md\n');

  const files = targets.flatMap((t) => collectFiles(t));
  const findings = [];

  for (const file of files) {
    let content;
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const r = rel(file);
    for (const rule of RULES) {
      findings.push(...rule.test(content, r));
    }
  }

  if (findings.length === 0) {
    console.log('Heuristic scan: no anti-patterns flagged in scope.');
    console.log('OK: design-review pre-pass complete (run full 3-skill review in agent).\n');
    process.exit(0);
  }

  console.log('Heuristic scan findings:\n');
  for (const f of findings) {
    console.log(`${f.file}:${f.line} - ${f.msg}`);
  }
  console.log('\nPre-pass done with warnings. Fix or confirm false positives, then run full critique.\n');
  process.exit(0);
}

main();
