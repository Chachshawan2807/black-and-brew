#!/usr/bin/env node
/**
 * Cross-platform launcher for AgentSkillOS Python commands.
 * Usage: node .agent-skills/scripts/asos-runner.mjs <build|ui> [extra args...]
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const VENV_DIR = join(ROOT, '.venv');
const ASOS_ROOT = join(ROOT, 'vendor', 'AgentSkillOS');
const CONFIG = join(ROOT, 'asos', 'config.yaml');

const isWin = process.platform === 'win32';
const python = join(VENV_DIR, isWin ? 'Scripts/python.exe' : 'bin/python');
const runPy = join(ASOS_ROOT, 'run.py');

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (!existsSync(python)) {
  fail(
    'AgentSkillOS venv not found. Run:\n' +
      '  py -3 -m venv .agent-skills/.venv\n' +
      '  .agent-skills/.venv/Scripts/pip install -e .agent-skills/vendor/AgentSkillOS',
  );
}

if (!existsSync(runPy)) {
  fail('AgentSkillOS vendor not found. Run: git submodule update --init .agent-skills/vendor/AgentSkillOS');
}

const [subcommand, ...extra] = process.argv.slice(2);

let args;
if (subcommand === 'build') {
  args = [runPy, 'build', '-g', 'black_and_brew', '-v', '--config', CONFIG, ...extra];
} else if (subcommand === 'ui') {
  args = [runPy, '--port', '8765', '--config', CONFIG, ...extra];
} else {
  fail('Usage: asos-runner.mjs <build|ui> [extra args...]');
}

const result = spawnSync(python, args, {
  cwd: ASOS_ROOT,
  stdio: 'inherit',
  env: { ...process.env },
});

process.exit(result.status ?? 1);
