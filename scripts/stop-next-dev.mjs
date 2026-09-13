/**
 * Stops a stale Next.js dev server for this repo (Windows-friendly).
 * Used before `next dev` so a second terminal does not hit "already running".
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const lockPath = path.join(root, '.next', 'dev', 'lock');

function killPid(pid) {
  if (!pid || pid <= 0) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
    }
  } catch {
    // Process already exited
  }
}

if (fs.existsSync(lockPath)) {
  try {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    killPid(lock.pid);
  } catch {
    // Ignore corrupt lock
  }
  try {
    fs.unlinkSync(lockPath);
  } catch {
    // Ignore
  }
}
