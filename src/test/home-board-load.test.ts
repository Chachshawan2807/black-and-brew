import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const homeActionsPath = resolve(__dirname, '../app/actions/home-actions.ts');
const homeClientPath = resolve(__dirname, '../app/[locale]/home/HomeClient.tsx');
const homePagePath = resolve(__dirname, '../app/[locale]/home/page.tsx');
const homeEntryPath = resolve(
  __dirname,
  '../app/[locale]/home/_components/HomeClientEntry.tsx',
);
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

  test('home page starts server board fetch in parallel with auth check', () => {
    const source = readFileSync(homePagePath, 'utf-8');
    expect(source).toContain('HomeClientEntry');
    expect(source).toContain('loadSecretaryBoard');
    expect(source).toContain('checkAuth');
    expect(source).toMatch(/const boardPromise = loadSecretaryBoard/);
    expect(source).toMatch(/const authed = await checkAuth\(\)/);
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

  test('client entry polls checkAuth once then loads board', () => {
    const source = readFileSync(homeEntryPath, 'utf-8');
    expect(source).toContain('waitForPinReadAccess');
    expect(source).toMatch(
      /const authed = await waitForPinReadAccess\(\)[\s\S]*const result = await loadSecretaryBoard/,
    );
    expect(source).not.toMatch(
      /for\s*\([^)]*attempt[^)]*\)[\s\S]*loadSecretaryBoard/,
    );
  });

  test('home loading skeleton does not show loading copy', () => {
    const source = readFileSync(skeletonPath, 'utf-8');
    expect(source).not.toContain('กำลังโหลดงาน');
  });
});
