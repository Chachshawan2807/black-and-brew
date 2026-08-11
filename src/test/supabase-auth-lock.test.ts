import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  resetSupabaseAuthLockForTests,
  runWithSupabaseAuthLock,
} from '@/lib/supabase-auth-lock';

const ROOT = resolve(process.cwd(), 'src');

describe('runWithSupabaseAuthLock', () => {
  beforeEach(() => {
    resetSupabaseAuthLockForTests();
  });

  test('runs tasks sequentially, not in parallel', async () => {
    const order: string[] = [];

    const first = runWithSupabaseAuthLock(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      order.push('first');
    });
    const second = runWithSupabaseAuthLock(async () => {
      order.push('second');
    });

    await Promise.all([first, second]);
    expect(order).toEqual(['first', 'second']);
  });

  test('continues the queue after a task throws', async () => {
    const order: string[] = [];

    await runWithSupabaseAuthLock(async () => {
      order.push('fail');
      throw new Error('boom');
    }).catch(() => {});

    await runWithSupabaseAuthLock(async () => {
      order.push('next');
    });

    expect(order).toEqual(['fail', 'next']);
  });
});

describe('supabase auth lock wiring', () => {
  test('browser client uses the in-memory GoTrue lock', () => {
    const source = readFileSync(resolve(ROOT, 'lib/supabase.ts'), 'utf-8');
    expect(source).toContain('createSupabaseAuthLock');
    expect(source).toMatch(/auth:\s*\{[\s\S]*lock:\s*createSupabaseAuthLock/);
  });
});
