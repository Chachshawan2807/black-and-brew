import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const homeActionsPath = resolve(__dirname, '../app/actions/home-actions.ts');
const syncPath = resolve(__dirname, '../hooks/use-home-board-sync.ts');
const homeClientPath = resolve(__dirname, '../app/[locale]/home/HomeClient.tsx');
const scopesPath = resolve(__dirname, '../lib/secretary/resolve-board-hydration-scopes.ts');

describe('home board snapshot hydrate', () => {
  test('exposes read-only hydrate action separate from derived sync', () => {
    const source = readFileSync(homeActionsPath, 'utf-8');
    expect(source).toContain('export async function hydrateSecretaryBoardSnapshot');
    expect(source).toContain('fetchSecretarySnapshotSlices');
    expect(source).toContain('isMinimalSecretaryBoardSnapshot');
    expect(source).toMatch(/reuseHydratedSnapshot[\s\S]*syncDerivedSecretaryTasks/);
    expect(source).toMatch(/reuseHydratedSnapshot \? \{\} : \{ snapshot \}/);
  });

  test('board sync hub loads snapshot detail in parallel with the task refresh', () => {
    const source = readFileSync(syncPath, 'utf-8');
    expect(source).toContain('hydrateBoardSnapshots');
    expect(source).toContain('requestHomeBoardSnapshotHydrate');
    expect(source).toMatch(/Promise\.all\(\[[\s\S]*hydrateBoardSnapshots/);
    expect(source).not.toMatch(/await hydrateBoardSnapshots\([\s\S]{0,400}await Promise\.all/);
    expect(source).toContain('getCurrentTasks');
    expect(source).toContain('getHydrationScopes');
  });

  test('HomeClient prefetches snapshot scopes for visible tasks and card open', () => {
    const source = readFileSync(homeClientPath, 'utf-8');
    expect(source).toContain('resolveSnapshotScopesForBoardTasks');
    expect(source).toContain('requestHomeBoardSnapshotHydrate');
  });

  test('resolve-board-hydration-scopes maps task modules to sync scopes', () => {
    const source = readFileSync(scopesPath, 'utf-8');
    expect(source).toContain('resolveSnapshotScopesForBoardTasks');
    expect(source).toContain('SCOPE_MODULES');
  });
});
