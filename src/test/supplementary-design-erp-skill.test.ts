import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');

function readRepo(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

describe('supplementary-design-erp overlay', () => {
  const overlay = readRepo('.cursor/skills/supplementary-design-erp/SKILL.md');

  test('overlay is registered in AGENTS.md skills table', () => {
    const agents = readRepo('AGENTS.md');
    expect(agents).toContain('supplementary-design-erp');
    expect(agents).toContain('extract-design-system');
    expect(agents).toContain('vercel-composition-patterns');
    expect(agents).toContain('sleek-design-mobile-apps');
    expect(agents).toContain('emil-design-eng');
  });

  test('overlay blocks ERP-critical conflicts', () => {
    expect(overlay).toContain('spreadsheet');
    expect(overlay).toContain('bb-pastel-surface');
    expect(overlay).toContain('use-inventory-notifications.ts');
    expect(overlay).toContain('shift-colors.ts');
    expect(overlay).toMatch(/sleek.*navigation/i);
    expect(overlay).toContain('motion-presets.ts');
  });

  test('installed upstream skill paths exist', () => {
    for (const skill of [
      'extract-design-system',
      'vercel-composition-patterns',
      'sleek-design-mobile-apps',
      'emil-design-eng',
    ]) {
      const skillMd = path.resolve(ROOT, `.agents/skills/${skill}/SKILL.md`);
      expect(fs.existsSync(skillMd), skill).toBe(true);
    }
  });

  test('skills-lock.json pins all four supplementary skills', () => {
    const lock = JSON.parse(readRepo('skills-lock.json')) as {
      skills: Record<string, unknown>;
    };
    for (const id of [
      'extract-design-system',
      'vercel-composition-patterns',
      'sleek-design-mobile-apps',
      'emil-design-eng',
    ]) {
      expect(lock.skills[id], id).toBeDefined();
    }
  });
});
