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
  test('loadSecretaryBoard starts the task query before the auth gate resolves', () => {
    const source = readFileSync(homeActionsPath, 'utf-8');
    const start = source.indexOf('export async function loadSecretaryBoard');
    const fn = source.slice(start);
    const queryAt = fn.indexOf('const tasksPromise = querySecretaryTasks(dateIso)');
    const authAt = fn.indexOf('await requireReadAccess()');
    expect(queryAt).toBeGreaterThan(0);
    expect(authAt).toBeGreaterThan(queryAt);
  });

  test('loadSecretaryBoard defers blocking derived sync by default', () => {
    const source = readFileSync(homeActionsPath, 'utf-8');
    expect(source).toContain('deferDerivedSync');
    expect(source).toMatch(/deferDerivedSync\s*=\s*opts\?\.deferDerivedSync\s*\?\?\s*true/);
    expect(source).toMatch(/if\s*\(\s*deferDerivedSync\s*\)/);
    expect(source).toContain('buildMinimalSecretaryBoardSnapshot');
    expect(source).toContain('async function querySecretaryTasks');
    expect(source).toMatch(
      /if\s*\(\s*deferDerivedSync\s*\)\s*\{[\s\S]*?tasksPromise/,
    );
  });

  test('home page starts board and member panel fetches before awaiting auth', () => {
    const source = readFileSync(homePagePath, 'utf-8');
    expect(source).toContain('HomeClientEntry');
    expect(source).toContain('loadSecretaryBoard');
    expect(source).toContain('loadHomeMemberPanel');
    expect(source).toContain('checkAuth');
    expect(source).toMatch(
      /const boardPromise = loadSecretaryBoard[\s\S]*const memberPanelPromise = loadHomeMemberPanel[\s\S]*await authedPromise/,
    );
  });

  test('home page paints cached cards while the live board streams', () => {
    const source = readFileSync(homePagePath, 'utf-8');
    expect(source).toContain('HomeCachedPageFallback');
    expect(source).toContain('HomeCachedTaskFallback');
    expect(source).toContain('scheduleHomeBoardDetail');
    expect(source).toContain('detailPromise');
    expect(source).not.toMatch(/await scheduleHomeBoardDetail/);
  });

  test('home page streams tasks and member panel in separate Suspense boundaries', () => {
    const source = readFileSync(homePagePath, 'utf-8');
    const suspenseCount = [...source.matchAll(/<Suspense\b/g)].length;
    expect(suspenseCount).toBeGreaterThanOrEqual(3);
    expect(source).toContain('HomeTasksSlot');
    expect(source).toContain('HomeShiftsSlot');
    expect(source).not.toMatch(
      /await Promise\.all\(\[\s*boardPromise,\s*memberPanelPromise/,
    );
    expect(source).not.toMatch(
      /const \[boardResult, memberPanelResult\] = await Promise\.all/,
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
    expect(source).not.toMatch(/timeout:\s*1200/);
    expect(source).toMatch(
      /requestHomeBoardFullSync\(\)/,
    );
  });

  test('client entry loads board after PIN without a checkAuth poll loop', () => {
    const source = readFileSync(homeEntryPath, 'utf-8');
    expect(source).toContain('waitForPinReadAccess');
    expect(source).toContain('loadHomeMemberPanel');
    expect(source).toContain('readCachedHomeMemberPanel');
    expect(source).not.toMatch(
      /const \[result, memberResult\] = await Promise\.all/,
    );
    expect(source).not.toContain('SESSION_POLL_MS');
    expect(source).not.toMatch(
      /for\s*\([^)]*attempt[^)]*\)[\s\S]*loadSecretaryBoard/,
    );
  });

  test('client entry paints the secretary board before the member panel resolves', () => {
    const source = readFileSync(homeEntryPath, 'utf-8');
    expect(source).toMatch(/const boardPromise = loadSecretaryBoard/);
    expect(source).toMatch(/const panelPromise = loadHomeMemberPanel/);
    expect(source).toMatch(/const boardResult = await boardPromise/);
    expect(source).toMatch(/setBoard\(boardResult\.board\)/);
    expect(source).toMatch(/void panelPromise\.then/);
  });

  test('home loading skeleton does not show loading copy', () => {
    const source = readFileSync(skeletonPath, 'utf-8');
    expect(source).not.toContain('กำลังโหลดงาน');
  });
});
