import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      return collectSourceFiles(path);
    }

    return /\.(ts|tsx|js|jsx)$/.test(entry) ? [path] : [];
  });
}

describe('retired LINE integration', () => {
  it('does not keep LINE app dependencies, env examples, or source references', () => {
    const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const dependencyNames = [
      ...Object.keys(packageJson.dependencies ?? {}),
      ...Object.keys(packageJson.devDependencies ?? {}),
    ];

    expect(dependencyNames).not.toContain('@line/bot-sdk');

    const envExample = readFileSync(join(root, '.env.example'), 'utf8');
    expect(envExample).not.toMatch(/\bLINE_/);
    expect(envExample).not.toMatch(/\bLINE Messaging API\b/i);

    const forbiddenSourcePattern =
      /@line\/bot-sdk|LINE_CHANNEL|LINE_TARGET|sendLineNotification|pushLineMessage|line-notify|lib\/line/i;
    const offenders = collectSourceFiles(join(root, 'src'))
      .filter((file) => !relative(root, file).startsWith(join('src', 'test')))
      .filter((file) => forbiddenSourcePattern.test(readFileSync(file, 'utf8')))
      .map((file) => relative(root, file));

    expect(offenders).toEqual([]);
  });
});
