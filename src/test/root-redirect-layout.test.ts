import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const APP_ROOT = path.resolve(__dirname, '../app');

describe('root redirect route layout', () => {
  test('uses a separate root layout for the locale redirect route', () => {
    const page = fs.readFileSync(path.join(APP_ROOT, '(root)/page.tsx'), 'utf-8');
    const layout = fs.readFileSync(path.join(APP_ROOT, '(root)/layout.tsx'), 'utf-8');

    expect(page).toMatch(/redirect\(["']\/th["']\)/);
    expect(layout).toMatch(/<html\b/);
    expect(layout).toMatch(/<body\b/);
  });
});
