import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

describe('Vercel production sync guard', () => {
  test('verify script compares githubCommitSha to expected SHA', () => {
    const script = readFile('../scripts/verify-vercel-production-sync.mjs');
    expect(script).toContain('githubCommitSha');
    expect(script).toContain('VERCEL_TOKEN');
    expect(script).toContain('--wait-minutes');
  });

  test('GitHub workflow runs on main push when token is set', () => {
    const workflow = readFile('../.github/workflows/vercel-production-sync.yml');
    expect(workflow).toContain('branches:');
    expect(workflow).toContain('- main');
    expect(workflow).toContain('verify-vercel-production-sync.mjs');
    expect(workflow).toContain('VERCEL_TOKEN');
  });

  test('deploy doc documents drift recovery and CI secret', () => {
    const doc = readFile('../docs/deploy/vercel-only-hosting.md');
    expect(doc).toContain('deploy:verify-production');
    expect(doc).toContain('vercel-production-sync.yml');
    expect(doc).toContain('VERCEL_TOKEN');
  });
});
