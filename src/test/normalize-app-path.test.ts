import { describe, expect, test } from 'vitest';
import { normalizeAppPath } from '@/lib/normalize-app-path';

describe('normalizeAppPath', () => {
  test('strips trailing slash except root', () => {
    expect(normalizeAppPath('/th')).toBe('/th');
    expect(normalizeAppPath('/th/')).toBe('/th');
    expect(normalizeAppPath('/th/inventory/')).toBe('/th/inventory');
    expect(normalizeAppPath('/')).toBe('/');
  });
});
