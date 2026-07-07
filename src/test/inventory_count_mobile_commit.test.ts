import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const countPage = fs.readFileSync(
  path.resolve(__dirname, '../app/[locale]/inventory/count/InventoryCountClient.tsx'),
  'utf-8',
);

describe('inventory count mobile commit', () => {
  test('reads draft from valueRef so blur-before-enter on mobile cannot discard unsaved input', () => {
    expect(countPage).toContain('valueRef');
    expect(countPage).toMatch(/valueRef\.current\s*=\s*value/);
    expect(countPage).toMatch(/const rawVal = valueRef\.current/);
  });

  test('defers blur discard and commits when focus moves to another count input', () => {
    expect(countPage).toContain('committingRef');
    expect(countPage).toMatch(/setTimeout\(\(\) => \{[\s\S]*handleBlur|handleBlur[\s\S]*setTimeout/);
    expect(countPage).toContain('active.dataset.countRowIndex');
    expect(countPage).toContain("e.key === 'Tab'");
  });

  test('uses form submit for mobile keyboard next/done actions', () => {
    expect(countPage).toMatch(/<form[\s\S]*onSubmit[\s\S]*data-count-row-index/);
  });
});
