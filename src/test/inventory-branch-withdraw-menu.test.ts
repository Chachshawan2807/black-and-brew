import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('branch withdraw navigation', () => {
  test('menu lists branch-withdraw route', () => {
    const menu = fs.readFileSync(path.resolve(__dirname, '../lib/menu-list.ts'), 'utf-8');
    expect(menu).toContain('/inventory/branch-withdraw');
    expect(menu).toContain('เบิกของสาขา 2');
  });
});
