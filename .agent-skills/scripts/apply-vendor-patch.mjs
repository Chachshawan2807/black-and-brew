#!/usr/bin/env node
/**
 * Apply BLACKANDBREW vendor patch to AgentSkillOS submodule (idempotent).
 * Run after: git submodule update --init .agent-skills/vendor/AgentSkillOS
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.env.VERCEL === '1') {
  process.exit(0);
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VENDOR = join(ROOT, 'vendor', 'AgentSkillOS');
const CONSTANTS = join(VENDOR, 'src', 'constants.py');
const PATCH = join(ROOT, 'patches', 'constants-black-and-brew.patch');

if (!existsSync(CONSTANTS)) {
  process.exit(0);
}

const source = readFileSync(CONSTANTS, 'utf-8');
if (source.includes('"id": "black_and_brew"')) {
  process.exit(0);
}

try {
  execFileSync('git', ['apply', '--check', PATCH], { cwd: VENDOR, stdio: 'pipe' });
  execFileSync('git', ['apply', PATCH], { cwd: VENDOR, stdio: 'inherit' });
  console.log('Applied AgentSkillOS vendor patch (black_and_brew skill group).');
} catch (error) {
  console.error(
    'Failed to apply .agent-skills/patches/constants-black-and-brew.patch\n'
      + 'Ensure submodule is at upstream main: git submodule update --init .agent-skills/vendor/AgentSkillOS',
  );
  process.exit(1);
}
