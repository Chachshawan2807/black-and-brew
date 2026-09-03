#!/usr/bin/env node
/**
 * Notification hub smoke runs the targeted Vitest bundle from AGENTS.md notification-hub-standard.
 */
import { spawnSync } from 'node:child_process';

const HELP = `Usage: notification-smoke.mjs [--help]

Runs npm run test:notifications (notification hub regression bundle).
`;

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(HELP);
  process.exit(0);
}

console.log('\n→ notification hub regression (test:notifications)');
const result = spawnSync('npm', ['run', 'test:notifications'], {
  stdio: 'inherit',
  shell: true,
});

if (result.status !== 0) {
  console.error(`\nFAIL: notification-smoke (exit ${result.status ?? 1})`);
  process.exit(result.status ?? 1);
}

console.log('\nOK: notification-smoke passed');
process.exit(0);
