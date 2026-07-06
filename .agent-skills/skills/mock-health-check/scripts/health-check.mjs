#!/usr/bin/env node
/**
 * Mock health check — verifies AgentSkillOS skill runner end-to-end.
 */
import { spawnSync } from 'node:child_process';

const HELP = `Usage: health-check.mjs [--help]

Runs a minimal smoke check: eslint + one fast vitest file.
`;

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(HELP);
  process.exit(0);
}

function run(label, cmd, args) {
  console.log(`\n→ ${label}`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    console.error(`\nFAIL: ${label} (exit ${result.status ?? 1})`);
    process.exit(result.status ?? 1);
  }
}

run('eslint', 'npm', ['run', 'lint']);
run('vitest smoke', 'npm', ['run', 'test', '--', 'src/test/daily_report_summary.test.ts']);

console.log('\nOK: mock-health-check passed');
process.exit(0);
