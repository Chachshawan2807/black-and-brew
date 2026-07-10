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
  test('passes moduleFilter to fetchDataChangeLogs instead of filtering only client-side', () => {
    expect(sectionSource).toMatch(
      /fetchDataChangeLogs\(\{\s*limit:\s*50,\s*module:\s*moduleFilter\s*===\s*["']all["']\s*\?\s*undefined\s*:\s*moduleFilter/,
    );
    expect(sectionSource).not.toMatch(
      /moduleFilter === ["']all["'] \? rows : rows\.filter/,
    );
  });

  test('reloads when moduleFilter changes and reuses load for retry', () => {
    expect(sectionSource).toMatch(/const load = useCallback\(async \(\) => \{/);
    expect(sectionSource).toMatch(/\}, \[moduleFilter\]\);/);
    expect(sectionSource).toMatch(/void load\(\);\s*\}, \[moduleFilter,\s*load\]\)/);
    expect(sectionSource).toMatch(/onClick=\{\(\) => void load\(\)\}/);
  });
});
