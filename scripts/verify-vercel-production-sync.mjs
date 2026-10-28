#!/usr/bin/env node
/**
 * Fail when Vercel Production is not on the expected Git commit (GitHub main drift).
 *
 * Usage:
 *   node scripts/verify-vercel-production-sync.mjs
 *   node scripts/verify-vercel-production-sync.mjs --expect-sha abc123
 *   node scripts/verify-vercel-production-sync.mjs --wait-minutes 20
 *
 * Env: VERCEL_TOKEN (required), VERCEL_PROJECT_ID, VERCEL_ORG_ID, GITHUB_SHA
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const DEFAULT_PROJECT_ID = 'prj_o9g154ROglqxrcfrPpW3CScEN1e2';
const DEFAULT_TEAM_ID = 'team_xlAtjJPHUWGQ9gvL9oETy8cn';

function parseArgs(argv) {
  const args = {
    expectSha: process.env.GITHUB_SHA ?? '',
    waitMinutes: 0,
    pollSeconds: 30,
    projectId: process.env.VERCEL_PROJECT_ID ?? '',
    teamId: process.env.VERCEL_ORG_ID ?? process.env.VERCEL_TEAM_ID ?? '',
  };

  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--expect-sha' && argv[i + 1]) {
      args.expectSha = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--wait-minutes' && argv[i + 1]) {
      args.waitMinutes = Number(argv[i + 1]);
      i += 1;
    } else if (argv[i] === '--poll-seconds' && argv[i + 1]) {
      args.pollSeconds = Number(argv[i + 1]);
      i += 1;
    } else if (argv[i] === '--project' && argv[i + 1]) {
      args.projectId = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--team' && argv[i + 1]) {
      args.teamId = argv[i + 1];
      i += 1;
    }
  }

  if (!args.projectId || !args.teamId) {
    try {
      const linked = JSON.parse(readFileSync(path.join(ROOT, '.vercel', 'project.json'), 'utf8'));
      args.projectId = args.projectId || linked.projectId || DEFAULT_PROJECT_ID;
      args.teamId = args.teamId || linked.orgId || DEFAULT_TEAM_ID;
    } catch {
      args.projectId = args.projectId || DEFAULT_PROJECT_ID;
      args.teamId = args.teamId || DEFAULT_TEAM_ID;
    }
  }

  if (!args.expectSha) {
    try {
      args.expectSha = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
    } catch {
      // caller must pass --expect-sha
    }
  }

  return args;
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchLatestProductionSha({ token, projectId, teamId }) {
  const params = new URLSearchParams({
    projectId,
    target: 'production',
    limit: '1',
    teamId,
  });

  const res = await fetch(`https://api.vercel.com/v6/deployments?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Vercel API ${res.status}: ${body.slice(0, 400)}`);
  }

  const data = await res.json();
  const deployment = data.deployments?.[0];
  if (!deployment) {
    return { sha: null, state: null, url: null, message: null };
  }

  return {
    sha: deployment.meta?.githubCommitSha ?? null,
    state: deployment.state ?? deployment.readyState ?? null,
    url: deployment.url ?? null,
    message: deployment.meta?.githubCommitMessage ?? null,
  };
}

function shortSha(sha) {
  return sha ? sha.slice(0, 7) : '(none)';
}

async function main() {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    console.error('VERCEL_TOKEN is required (Vercel account token with project read access).');
    process.exit(2);
  }

  const args = parseArgs(process.argv);
  if (!args.expectSha) {
    console.error('Could not resolve expected SHA. Set GITHUB_SHA or pass --expect-sha.');
    process.exit(2);
  }

  const deadline = Date.now() + args.waitMinutes * 60_000;
  let attempt = 0;

  while (true) {
    attempt += 1;
    const prod = await fetchLatestProductionSha({
      token,
      projectId: args.projectId,
      teamId: args.teamId,
    });

    const match =
      prod.sha &&
      (prod.sha === args.expectSha || prod.sha.startsWith(args.expectSha) || args.expectSha.startsWith(prod.sha));

    console.log(
      `[verify-vercel] attempt ${attempt}: production=${shortSha(prod.sha)} state=${prod.state ?? '?'} expected=${shortSha(args.expectSha)}`,
    );

    if (match && (prod.state === 'READY' || prod.state === 'ready')) {
      console.log('Vercel Production matches expected Git commit.');
      if (prod.message) console.log(`Deployment message: ${prod.message.split('\n')[0]}`);
      process.exit(0);
    }

    if (Date.now() >= deadline) {
      console.error(
        'Production drift: Vercel latest production deployment is not on the expected commit.',
      );
      console.error(`Expected: ${args.expectSha}`);
      console.error(`Production: ${prod.sha ?? 'unknown'} (${prod.state ?? 'unknown'})`);
      console.error('Fix: Vercel → Deployments → Deploy branch main (Production), or reconnect Git.');
      console.error('Docs: docs/deploy/vercel-only-hosting.md');
      process.exit(1);
    }

    await sleep(args.pollSeconds * 1000);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
