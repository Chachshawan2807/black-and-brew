import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

describe('inventory latest count times client', () => {
  test('reads verifications via authenticated supabase client (not server action)', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../lib/inventory-latest-count-times-client.ts'),
      'utf-8',
    );

    expect(source).toContain('inventory_count_verifications');
    expect(source).toContain('ensureSupabaseSession');
    expect(source).toContain('buildLatestCountedAtByItemId');
    expect(source).not.toContain("'use server'");
  });
});
