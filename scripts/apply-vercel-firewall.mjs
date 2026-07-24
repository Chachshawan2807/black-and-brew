#!/usr/bin/env node
/**
 * Enable Vercel Firewall managed rules for the linked project.
 *
 * Usage:
 *   node scripts/apply-vercel-firewall.mjs
 *   node scripts/apply-vercel-firewall.mjs --project prj_xxx --team team_xxx
 */

import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '..', 'config', 'vercel-firewall.json');

function parseArgs(argv) {
  const args = {
    dryRun: false,
    projectId: process.env.VERCEL_PROJECT_ID ?? '',
    teamId: process.env.VERCEL_ORG_ID ?? '',
  };

  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--dry-run') args.dryRun = true;
    if (argv[i] === '--project' && argv[i + 1]) {
      args.projectId = argv[i + 1];
      i += 1;
    }
    if (argv[i] === '--team' && argv[i + 1]) {
      args.teamId = argv[i + 1];
      i += 1;
    }
  }

  if (!args.projectId) {
    try {
      const linked = JSON.parse(
        readFileSync(path.join(process.cwd(), '.vercel', 'project.json'), 'utf8'),
      );
      args.projectId = linked.projectId ?? args.projectId;
      args.teamId = linked.orgId ?? args.teamId;
    } catch {
      // ignore — caller must pass ids explicitly
    }
  }

  return args;
}

function patchFirewall(projectId, teamId, body) {
  const query = teamId
    ? `projectId=${projectId}&teamId=${teamId}`
    : `projectId=${projectId}`;

  const tempDir = mkdtempSync(path.join(tmpdir(), 'vercel-firewall-'));
  const inputFile = path.join(tempDir, 'body.json');
  writeFileSync(inputFile, JSON.stringify(body));

  const quotedInput = JSON.stringify(inputFile);
  const command = `vercel api "/v1/security/firewall/config?${query}" -X PATCH --input ${quotedInput}`;

  try {
    const stdout = execSync(command, {
      encoding: 'utf8',
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    return { ok: true, stdout: stdout.trim(), stderr: '' };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout?.trim() ?? '',
      stderr: error.stderr?.trim() ?? error.message ?? '',
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function main() {
  const { dryRun, projectId, teamId } = parseArgs(process.argv);
  if (!projectId) {
    console.error('Missing project id. Link the repo (`vercel link`) or pass --project <id>.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const updates = [
    { action: 'firewallEnabled', id: null, value: true },
    ...Object.entries(config.managedRules ?? {}).map(([rule, settings]) => ({
      action: 'managedRules.update',
      id: rule,
      value: settings,
    })),
  ];

  if (dryRun) {
    console.log('[dry-run] Would apply firewall updates to', projectId);
    console.log(JSON.stringify(updates, null, 2));
    return;
  }

  for (const update of updates) {
    const result = patchFirewall(projectId, teamId, update);
    if (!result.ok) {
      console.error(`Failed action ${update.action}:`, result.stderr || result.stdout);
      process.exit(1);
    }
    console.log(`Applied ${update.action}${update.id ? ` (${update.id})` : ''}`);
  }

  console.log('Firewall managed rules enabled. Add custom rules in Dashboard → Firewall if needed.');
  console.log('Docs: docs/security/waf-and-ddos.md');
}

main();
