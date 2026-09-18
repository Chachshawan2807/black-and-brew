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

  test('home page starts board and member panel fetches before awaiting auth', () => {
    const source = readFileSync(homePagePath, 'utf-8');
    expect(source).toContain('HomeClientEntry');
    expect(source).toContain('loadSecretaryBoard');
    expect(source).toContain('loadHomeMemberPanel');
    expect(source).toContain('checkAuth');
    expect(source).toMatch(
      /const boardPromise = loadSecretaryBoard[\s\S]*const memberPanelPromise = loadHomeMemberPanel[\s\S]*await checkAuth\(\)/,
    );
    expect(source).toMatch(
      /Promise\.all\(\[\s*boardPromise,\s*memberPanelPromise/,
    );
  });

  test('client home code does not import panel types from server actions', () => {
    const homeClient = readFileSync(homeClientPath, 'utf-8');
    const homeEntry = readFileSync(homeEntryPath, 'utf-8');
    expect(homeClient).not.toMatch(/HomeMemberPanelSnapshot[\s\S]*from ['"]@\/app\/actions\/home-actions['"]/);
    expect(homeEntry).not.toMatch(/HomeMemberPanelSnapshot[\s\S]*from ['"]@\/app\/actions\/home-actions['"]/);
    expect(homeClient).toContain('@/lib/schedule/home-member-panel');
  });

  test('HomeClient imports next/dynamic when lazy-loading overlays', () => {
    const source = readFileSync(homeClientPath, 'utf-8');
    expect(source).toMatch(/import dynamic from ['"]next\/dynamic['"]/);
    expect(source).toContain('dynamic(');
  });

  test('HomeClient triggers background board sync after SSR hydrate', () => {
    const source = readFileSync(homeClientPath, 'utf-8');
    expect(source).toContain('skipInitialFullSync: true');
    expect(source).toContain('requestHomeBoardFullSync');
    expect(source).toContain('writeCachedSecretaryBoard');
    expect(source).toMatch(
      /scheduleIdleWork\(\(\)\s*=>\s*requestHomeBoardFullSync\(\)/,
    );
  });

  test('client entry polls checkAuth once then loads board and member panel', () => {
    const source = readFileSync(homeEntryPath, 'utf-8');
    expect(source).toContain('waitForPinReadAccess');
    expect(source).toContain('loadHomeMemberPanel');
    expect(source).toMatch(
      /const authed = await waitForPinReadAccess\(\)[\s\S]*Promise\.all\(\[[\s\S]*loadSecretaryBoard[\s\S]*loadHomeMemberPanel/,
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
