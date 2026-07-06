#!/usr/bin/env node
/**
 * AgentSkillOS terminal skill runner — list, run, validate project runbooks.
 * Usage: node .agent-skills/scripts/skill-runner.mjs <list|run|validate> [skillId] [-- ...args]
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(ROOT, '..');
const REGISTRY_PATH = join(ROOT, 'registry.json');

function loadRegistry() {
  if (!existsSync(REGISTRY_PATH)) {
    console.error(`Registry not found: ${REGISTRY_PATH}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
}

function findSkill(registry, id) {
  return registry.skills?.find((s) => s.id === id) ?? null;
}

function cmdList(registry) {
  const skills = registry.skills ?? [];
  if (skills.length === 0) {
    console.log('No skills registered.');
    return;
  }
  console.log('Registered skills:\n');
  for (const skill of skills) {
    const tags = skill.tags?.length ? ` [${skill.tags.join(', ')}]` : '';
    console.log(`  ${skill.id}${tags}`);
    console.log(`    ${skill.description ?? '(no description)'}`);
  }
}

function cmdValidate(registry) {
  let failed = false;
  for (const skill of registry.skills ?? []) {
    const skillDir = join(ROOT, skill.path);
    const skillMd = join(skillDir, 'SKILL.md');
    const scriptPath = join(skillDir, skill.script);
    let skillOk = true;

    for (const [path, label] of [
      [skillMd, 'SKILL.md'],
      [scriptPath, skill.script],
    ]) {
      if (!existsSync(path)) {
        console.error(`FAIL ${skill.id}: missing ${label} at ${path}`);
        failed = true;
        skillOk = false;
      }
    }
    if (skillOk) {
      console.log(`OK   ${skill.id}`);
    }
  }
  if (failed) process.exit(1);
  console.log(`\nValidated ${registry.skills?.length ?? 0} skill(s).`);
}

function cmdRun(registry, skillId, extraArgs) {
  if (!skillId) {
    console.error('Usage: skill-runner.mjs run <skillId> [-- ...args]');
    process.exit(1);
  }

  const skill = findSkill(registry, skillId);
  if (!skill) {
    console.error(`Unknown skill: ${skillId}`);
    console.error('Run "npm run skill:list" to see registered skills.');
    process.exit(1);
  }

  const scriptPath = join(ROOT, skill.path, skill.script);
  if (!existsSync(scriptPath)) {
    console.error(`Script not found: ${scriptPath}`);
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [scriptPath, ...extraArgs], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    shell: false,
  });

  process.exit(result.status ?? 1);
}

const [command, skillId, ...rest] = process.argv.slice(2);
const dashIndex = rest.indexOf('--');
const extraArgs = dashIndex >= 0 ? rest.slice(dashIndex + 1) : [];

const registry = loadRegistry();

switch (command) {
  case 'list':
    cmdList(registry);
    break;
  case 'validate':
    cmdValidate(registry);
    break;
  case 'run':
    cmdRun(registry, skillId, extraArgs);
    break;
  default:
    console.error('Usage: skill-runner.mjs <list|run|validate> [skillId] [-- ...args]');
    process.exit(1);
}
