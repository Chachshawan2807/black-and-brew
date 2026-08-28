#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CRON_JOB_ORG_API } from './cron-job-org-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDotEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function deleteJob(apiKey, jobId) {
  const response = await fetch(`${CRON_JOB_ORG_API}/jobs/${jobId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DELETE #${jobId} → ${response.status}: ${text}`);
  }
}

loadDotEnvLocal();
const apiKey = process.env.CRON_JOB_ORG_API_KEY?.trim();
if (!apiKey) {
  console.error('Missing CRON_JOB_ORG_API_KEY');
  process.exit(1);
}

const jobIds = process.argv.slice(2).map(Number).filter(Boolean);
if (jobIds.length === 0) {
  console.error('Usage: node scripts/delete-cron-jobs.mjs <jobId> [...]');
  process.exit(1);
}

for (const jobId of jobIds) {
  await deleteJob(apiKey, jobId);
  console.log(`deleted | #${jobId}`);
  await new Promise((resolve) => setTimeout(resolve, 1100));
}
