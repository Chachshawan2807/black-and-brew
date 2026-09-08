import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const sectionSource = fs.readFileSync(
  path.resolve(
    __dirname,
    '../app/[locale]/settings/_components/DataChangeHistorySection.tsx',
  ),
  'utf-8',
);

describe('DataChangeHistorySection module filter', () => {
  test('passes moduleFilter through settings data cache instead of filtering only client-side', () => {
    expect(sectionSource).toContain('getOrFetchEditHistory');
    expect(sectionSource).toMatch(
      /getOrFetchEditHistory\(\{\s*limit:\s*EDIT_HISTORY_INITIAL_LIMIT,\s*module,/,
    );
    expect(sectionSource).not.toMatch(
      /moduleFilter === ["']all["'] \? rows : rows\.filter/,
    );
    expect(sectionSource).not.toContain('fetchDataChangeLogs');
  });

  test('reloads when moduleFilter changes and reuses load for retry', () => {
    expect(sectionSource).toMatch(/const load = useCallback\(async \(\) => \{/);
    expect(sectionSource).toMatch(/\}, \[moduleFilter\]\);/);
    expect(sectionSource).toMatch(/void load\(\);\s*\}, \[moduleFilter,\s*load\]\)/);
    expect(sectionSource).toMatch(/onClick=\{\(\) => void load\(\)\}/);
  });

  test('does not show network IP in edit history lines', () => {
    expect(sectionSource).not.toContain('จากเครือข่าย');
    expect(sectionSource).not.toContain('ip_address');
    expect(sectionSource).toContain('formatDataChangeHistoryMeta');
  });

  test('loads edit history incrementally instead of expanding all at once', () => {
    expect(sectionSource).toContain('INITIAL_VISIBLE_COUNT');
    expect(sectionSource).toContain('LOAD_MORE_COUNT');
    expect(sectionSource).toContain('visibleCount');
    expect(sectionSource).not.toContain('showAll');
    expect(sectionSource).toContain('ดูเพิ่มเติม');
    expect(sectionSource).not.toContain('ดูรายละเอียด');
    expect(sectionSource).toMatch(
      /Math\.min\(count \+ LOAD_MORE_COUNT, rows\.length\)/,
    );
  });
});
