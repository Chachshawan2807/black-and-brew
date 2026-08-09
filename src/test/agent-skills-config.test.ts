import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const ROOT = resolve(__dirname, '../..');
const CONSTANTS = resolve(ROOT, '.agent-skills/vendor/AgentSkillOS/src/constants.py');
const SKILLS_DIR = resolve(ROOT, '.agent-skills/skills');
const TREE_PATH = resolve(ROOT, '.agent-skills/data/capability_trees/tree_black_and_brew.yaml');
const VECTOR_DB_PATH = resolve(ROOT, '.agent-skills/data/vector_stores/black_and_brew');
const PYTHON = resolve(ROOT, '.agent-skills/.venv/Scripts/python.exe');

describe('AgentSkillOS black_and_brew skill group', () => {
  test('skills_dir targets repo .agent-skills/skills explicitly', () => {
    const source = readFileSync(CONSTANTS, 'utf-8');
    expect(source).toContain('AGENT_SKILLS_ROOT = REPO_ROOT / ".agent-skills"');
    expect(source).toContain('"skills_dir": str(AGENT_SKILLS_ROOT / "skills")');
    expect(source).toContain(
      '"tree_path": str(AGENT_SKILLS_ROOT / "data" / "capability_trees" / "tree_black_and_brew.yaml")',
    );
    expect(source).toContain(
      '"vector_db_path": str(AGENT_SKILLS_ROOT / "data" / "vector_stores" / "black_and_brew")',
    );
    expect(source).not.toMatch(/PROJECT_ROOT\.parent\.parent \/ "skills"/);
    expect(source).not.toMatch(
      /"tree_path": str\(DATA_DIR \/ "capability_trees" \/ "tree_black_and_brew\.yaml"\)/,
    );
    expect(source).not.toMatch(
      /"vector_db_path": str\(DATA_DIR \/ "vector_stores" \/ "black_and_brew"\)/,
    );
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

  test('tree_path and vector_db_path target repo .agent-skills/data, not vendor data', () => {
    if (!existsSync(PYTHON)) return;

    const script =
      "import sys; sys.path.insert(0, r'.agent-skills/vendor/AgentSkillOS/src'); "
      + "from constants import SKILL_GROUPS; "
      + "g = next(x for x in SKILL_GROUPS if x['id'] == 'black_and_brew'); "
      + "print(g['tree_path']); print(g['vector_db_path'])";

    const output = execFileSync(PYTHON, ['-c', script], { cwd: ROOT, encoding: 'utf-8' }).trim();
    const [treePath, vectorDbPath] = output.split(/\r?\n/);

    expect(treePath.replace(/\\/g, '/')).toBe(TREE_PATH.replace(/\\/g, '/'));
    expect(vectorDbPath.replace(/\\/g, '/')).toBe(VECTOR_DB_PATH.replace(/\\/g, '/'));
    expect(treePath.replace(/\\/g, '/')).not.toContain('/vendor/AgentSkillOS/data/');
    expect(vectorDbPath.replace(/\\/g, '/')).not.toContain('/vendor/AgentSkillOS/data/');
  });
});
