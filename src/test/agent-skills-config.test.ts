import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const ROOT = resolve(__dirname, '../..');
const CONSTANTS = resolve(ROOT, '.agent-skills/vendor/AgentSkillOS/src/constants.py');
const SKILLS_DIR = resolve(ROOT, '.agent-skills/skills');
const PYTHON = resolve(ROOT, '.agent-skills/.venv/Scripts/python.exe');

describe('AgentSkillOS black_and_brew skill group', () => {
  test('skills_dir targets repo .agent-skills/skills explicitly', () => {
    const source = readFileSync(CONSTANTS, 'utf-8');
    expect(source).toContain('AGENT_SKILLS_ROOT = REPO_ROOT / ".agent-skills"');
    expect(source).toContain('"skills_dir": str(AGENT_SKILLS_ROOT / "skills")');
    expect(source).not.toMatch(/PROJECT_ROOT\.parent\.parent \/ "skills"/);
  });

  test('resolved skills_dir exists and contains registered runbooks', () => {
    if (!existsSync(PYTHON)) return;

    const resolved = execFileSync(
      PYTHON,
      [
        '-c',
        "import sys; sys.path.insert(0, r'.agent-skills/vendor/AgentSkillOS/src'); "
          + "from constants import SKILL_GROUPS; "
          + "print(next(g['skills_dir'] for g in SKILL_GROUPS if g['id'] == 'black_and_brew'))",
      ],
      { cwd: ROOT, encoding: 'utf-8' },
    ).trim();

    expect(resolved.replace(/\\/g, '/')).toBe(SKILLS_DIR.replace(/\\/g, '/'));
    expect(existsSync(resolve(resolved, 'mock-health-check', 'SKILL.md'))).toBe(true);
  });
});
