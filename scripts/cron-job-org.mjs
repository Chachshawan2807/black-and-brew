#!/usr/bin/env node
/**
 * Manage BLACKANDBREW cron-job.org jobs via REST API.
 *
 * Setup:
 *   1. Generate API key: cron-job.org Console → Settings
 *   2. Add to .env.local:
 *        CRON_JOB_ORG_API_KEY=...
 *        CRON_SECRET=...
 *        NEXT_PUBLIC_SITE_URL=https://blackandbrew.vercel.app
 *
 * Usage:
 *   node scripts/cron-job-org.mjs list
 *   node scripts/cron-job-org.mjs status
 *   node scripts/cron-job-org.mjs sync
 *   node scripts/cron-job-org.mjs sync --dry-run
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CRON_JOB_ORG_API,
  JOB_TITLE_PREFIX,
  buildDesiredJobs,
  buildJobPayload,
  findJobByTitle,
  jobNeedsUpdate,
} from './cron-job-org-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDotEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  try {
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
  } catch {
    // .env.local optional when vars are exported in shell
  }
}

function parseArgs(argv) {
  const args = { command: 'help', dryRun: false };
  const positional = argv.slice(2).filter((arg) => {
    if (arg === '--dry-run') {
      args.dryRun = true;
      return false;
    }
    return true;
  });
  if (positional[0]) args.command = positional[0];
  return args;
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name}. Set it in .env.local or the environment.`);
    process.exit(1);
  }
  return value;
}

function getConfig() {
  const apiKey = requireEnv('CRON_JOB_ORG_API_KEY');
  const cronSecret = requireEnv('CRON_SECRET');
  const baseUrl =
    process.env.CRON_JOB_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    'https://blackandbrew.vercel.app';

  return {
    apiKey,
    cronSecret,
    baseUrl,
    desiredJobs: buildDesiredJobs(baseUrl, cronSecret),
  };
}

async function apiRequest(apiKey, method, route, body) {
  const response = await fetch(`${CRON_JOB_ORG_API}${route}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const detail = data.message || data.error || text || response.statusText;
    throw new Error(`cron-job.org ${method} ${route} → ${response.status}: ${detail}`);
  }

  return data;
}

async function listJobs(apiKey) {
  const data = await apiRequest(apiKey, 'GET', '/jobs');
  return data.jobs ?? [];
}

async function getJobDetails(apiKey, jobId) {
  const data = await apiRequest(apiKey, 'GET', `/jobs/${jobId}`);
  return data.jobDetails ?? data.job ?? null;
}

function formatNextExecution(ts) {
  if (!ts) return ' ';
  return new Date(ts * 1000).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' });
}

function printJobs(jobs, { filterPrefix = true } = {}) {
  const filtered = filterPrefix
    ? jobs.filter((job) => job.title?.startsWith(JOB_TITLE_PREFIX))
    : jobs;

  if (filtered.length === 0) {
    console.log('No matching jobs found.');
    return;
  }

  for (const job of filtered) {
    console.log(
      [
        `#${job.jobId}`,
        job.enabled ? 'enabled' : 'disabled',
        job.title,
        job.url,
        `next: ${formatNextExecution(job.nextExecution)}`,
      ].join(' | '),
    );
  }
}

async function commandList(config) {
  const jobs = await listJobs(config.apiKey);
  printJobs(jobs, { filterPrefix: false });
}

async function commandStatus(config) {
  const jobs = await listJobs(config.apiKey);

  for (const desired of config.desiredJobs) {
    const existing = findJobByTitle(jobs, desired.title);
    if (!existing) {
      console.log(`MISSING | ${desired.title} | ${desired.url}`);
      continue;
    }

    const details = await getJobDetails(config.apiKey, existing.jobId);
    const status = jobNeedsUpdate(details, desired) ? 'DRIFT' : 'OK';
    console.log(
      `${status} | #${existing.jobId} | ${desired.title} | next ${formatNextExecution(existing.nextExecution)}`,
    );
  }
}

async function commandSync(config, dryRun) {
  const jobs = await listJobs(config.apiKey);
  const actions = [];

  for (const desired of config.desiredJobs) {
    const existing = findJobByTitle(jobs, desired.title);
    const payload = buildJobPayload(desired);

    if (!existing) {
      actions.push({ type: 'create', title: desired.title, payload });
      continue;
    }

    const details = await getJobDetails(config.apiKey, existing.jobId);
    if (jobNeedsUpdate(details, desired)) {
      actions.push({ type: 'update', jobId: existing.jobId, title: desired.title, payload });
    } else {
      actions.push({ type: 'skip', jobId: existing.jobId, title: desired.title });
    }
  }

  if (actions.every((action) => action.type === 'skip')) {
    console.log('All jobs already match desired configuration.');
    return;
  }

  for (const action of actions) {
    if (action.type === 'skip') {
      console.log(`skip | #${action.jobId} | ${action.title}`);
      continue;
    }

    if (dryRun) {
      console.log(`${action.type} (dry-run) | ${action.title}`);
      continue;
    }

    if (action.type === 'create') {
      const result = await apiRequest(config.apiKey, 'PUT', '/jobs', { job: action.payload });
      console.log(`created | #${result.jobId} | ${action.title}`);
      await sleep(1100);
      continue;
    }

    await apiRequest(config.apiKey, 'PATCH', `/jobs/${action.jobId}`, { job: action.payload });
    console.log(`updated | #${action.jobId} | ${action.title}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printHelp() {
  console.log(`Usage:
  node scripts/cron-job-org.mjs list              List all cron-job.org jobs
  node scripts/cron-job-org.mjs status            Check BLACKANDBREW jobs vs desired config
  node scripts/cron-job-org.mjs sync              Create/update jobs to match repo config
  node scripts/cron-job-org.mjs sync --dry-run    Preview sync without API writes

Environment:
  CRON_JOB_ORG_API_KEY   cron-job.org Console → Settings
  CRON_SECRET            Bearer token sent to cron-protected /api/* routes
  NEXT_PUBLIC_SITE_URL   Production origin (or CRON_JOB_BASE_URL override)
`);
}

async function main() {
  loadDotEnvLocal();
  const args = parseArgs(process.argv);

  if (args.command === 'help' || args.command === '--help' || args.command === '-h') {
    printHelp();
    return;
  }

  const config = getConfig();

  switch (args.command) {
    case 'list':
      await commandList(config);
      break;
    case 'status':
      await commandStatus(config);
      break;
    case 'sync':
      await commandSync(config, args.dryRun);
      break;
    default:
      console.error(`Unknown command: ${args.command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
