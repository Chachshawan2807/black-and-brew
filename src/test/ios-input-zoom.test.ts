import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const ROOT = resolve(__dirname, '../..');

describe('iOS form input zoom prevention', () => {
  test('keeps editable controls at least 16px on mobile without locking page zoom', () => {
    const stylesheet = readFileSync(resolve(ROOT, 'src/app/[locale]/globals.css'), 'utf-8');
    const layout = readFileSync(resolve(ROOT, 'src/app/[locale]/layout.tsx'), 'utf-8');

    expect(stylesheet).toMatch(/@media\s*\(max-width:\s*767px\)[\s\S]*?input[\s\S]*?textarea[\s\S]*?select[\s\S]*?font-size:\s*16px/);
    expect(layout).toContain('initialScale: 1');
    expect(layout).not.toMatch(/userScalable|maximumScale/);
  });
});
