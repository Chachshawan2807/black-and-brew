import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const perfPath = resolve(__dirname, '../lib/perf/home-board-perf.ts');
const homeClientPath = resolve(__dirname, '../app/[locale]/home/HomeClient.tsx');
const syncPath = resolve(__dirname, '../hooks/use-home-board-sync.ts');

describe('home board perf instrumentation', () => {
  test('perf module exposes opt-in storage key and phases', () => {
    const source = readFileSync(perfPath, 'utf-8');
    expect(source).toContain("STORAGE_KEY = 'bb-home-perf'");
    expect(source).toContain('bb_home_perf=1');
    expect(source).toContain('full-sync-end');
    expect(source).toContain('board-ui-mounted');
  });

  test('HomeClient reports board visible and triggers full sync on mount', () => {
    const source = readFileSync(homeClientPath, 'utf-8');
    expect(source).toContain('homePerfOnBoardVisible');
    expect(source).toContain('requestHomeBoardFullSync');
  });

  test('board sync hub marks full sync duration', () => {
    const source = readFileSync(syncPath, 'utf-8');
    expect(source).toContain('homePerfFullSyncStart');
    expect(source).toContain('homePerfFullSyncEnd');
  });
});
