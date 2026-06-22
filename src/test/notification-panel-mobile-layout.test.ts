import fs from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

const ROOT = path.resolve(__dirname, '..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

describe('NotificationPanel mobile layout', () => {
  test('non-desktop drawer leaves a left tap strip via partial width', () => {
    const code = readFile('components/notifications/NotificationPanel.tsx');
    expect(code).toMatch(/max-md:w-\[85vw\]/);
    expect(code).toMatch(/max-md:max-w-none/);
  });

  test('backdrop remains full-screen for tap-to-dismiss', () => {
    const code = readFile('components/notifications/NotificationPanel.tsx');
    expect(code).toMatch(/fixed inset-0[\s\S]*onClick=\{closePanel\}/);
  });
});
