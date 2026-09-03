import { describe, expect, test } from 'vitest';
import { createPreloadOnce } from '@/lib/create-preload-once';

describe('createPreloadOnce', () => {
  test('dedupes loader calls on the client', () => {
    let calls = 0;
    const { preload, resetForTests } = createPreloadOnce(() => {
      calls += 1;
    });

    preload();
    preload();
    expect(calls).toBe(1);

    resetForTests();
    preload();
    expect(calls).toBe(2);
  });

  test('no-ops when window is undefined', () => {
    let calls = 0;
    const { preload } = createPreloadOnce(() => {
      calls += 1;
    });

    const originalWindow = globalThis.window;
    // @ts-expect-error test shim
    delete globalThis.window;

    preload();
    expect(calls).toBe(0);

    globalThis.window = originalWindow;
  });
});
