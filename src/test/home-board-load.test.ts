import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const homeActionsPath = resolve(__dirname, '../app/actions/home-actions.ts');
const homeClientPath = resolve(__dirname, '../app/[locale]/home/HomeClient.tsx');
const homePagePath = resolve(__dirname, '../app/[locale]/home/page.tsx');
const skeletonPath = resolve(
  __dirname,
  '../app/[locale]/home/_components/HomePageLoadingSkeleton.tsx',
);

describe('home secretary board load', () => {
  test('loadSecretaryBoard defers blocking derived sync by default', () => {
    const source = readFileSync(homeActionsPath, 'utf-8');
    expect(source).toContain('deferDerivedSync');
    expect(source).toMatch(/deferDerivedSync\s*=\s*opts\?\.deferDerivedSync\s*\?\?\s*true/);
    expect(source).toMatch(/if\s*\(\s*deferDerivedSync\s*\)/);
    expect(source).toContain('buildMinimalSecretaryBoardSnapshot');
    expect(source).toContain('async function querySecretaryTasks');
    expect(source).toMatch(
      /if\s*\(\s*deferDerivedSync\s*\)\s*\{[\s\S]*?querySecretaryTasks\(dateIso\)/,
    );
  });

  test('home page starts board fetch without waiting for checkAuth', () => {
    const source = readFileSync(homePagePath, 'utf-8');
    expect(source).toContain('const boardPromise = loadSecretaryBoard');
    expect(source).toContain('const authed = await checkAuth()');
    expect(source).toContain('HomePageLoadingSkeleton');
  });

  test('HomeClient triggers background board sync after SSR hydrate', () => {
    const source = readFileSync(homeClientPath, 'utf-8');
    expect(source).toContain('skipInitialFullSync: true');
    expect(source).toContain('requestHomeBoardFullSync');
    expect(source).toContain('writeCachedSecretaryBoard');
    expect(source).not.toMatch(
      /scheduleIdleWork\(\(\)\s*=>\s*\{\s*requestHomeBoardFullSync\(\);/,
    );
  });

  test('home loading skeleton does not show loading copy', () => {
    const source = readFileSync(skeletonPath, 'utf-8');
    expect(source).not.toContain('กำลังโหลดงาน');
  });
});
