import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const root = path.resolve(__dirname, '..', '..');

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), 'utf-8');
}

describe('read-only PIN view coverage (home board)', () => {
  test('derived secretary sync requires mutation access', () => {
    const source = read('src/app/actions/home-actions.ts');
    const syncStart = source.indexOf('export async function syncDerivedSecretaryTasks');
    const syncEnd = source.indexOf('export async function refreshDerivedSecretaryTasks');
    const syncBody = source.slice(syncStart, syncEnd);

    expect(syncBody).toContain('requireMutationAccess');
    expect(syncBody.indexOf('requireMutationAccess')).toBeLessThan(
      syncBody.indexOf('applyDerivedTaskDrafts'),
    );
  });

  test('read-only board sync uses view-only fetch without derived writes', () => {
    const source = read('src/app/actions/home-actions.ts');

    expect(source).toContain('async function fetchSecretaryBoardViewOnly');
    expect(source).toContain('session.readOnly');
    expect(source).toMatch(
      /if \(session\.ok && session\.readOnly\)[\s\S]*fetchSecretaryBoardViewOnly/,
    );
    expect(source).toMatch(
      /loadSecretaryBoard[\s\S]*session\.readOnly[\s\S]*fetchSecretarySnapshot/,
    );
  });

  test('sidebar menu order read requires PIN read access', () => {
    const source = read('src/app/actions/app-preferences-actions.ts');
    const getStart = source.indexOf('export async function getSidebarMenuOrder');
    const getBody = source.slice(getStart, getStart + 400);

    expect(getBody).toContain('requireReadAccess');
    expect(getBody.indexOf('requireReadAccess')).toBeLessThan(getBody.indexOf('getSupabaseAdmin'));
  });
});
