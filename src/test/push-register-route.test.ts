import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

describe('POST /api/push/register', () => {
  test('reuses registerPushSubscription so PWA clients are not tied to hashed Server Action IDs', () => {
    const source = readFileSync(
      resolve(__dirname, '../app/api/push/register/route.ts'),
      'utf8',
    );
    expect(source).toContain("from '@/app/actions/push-actions'");
    expect(source).toContain('registerPushSubscription');
    expect(source).toContain('export async function POST');
  });
});
