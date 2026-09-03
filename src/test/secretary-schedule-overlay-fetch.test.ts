import { describe, expect, test, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { promiseWithTimeout } from '@/lib/promise-with-timeout';
import { SCHEDULE_OVERLAY_FETCH_TIMEOUT_MS } from '@/lib/secretary/schedule-overlay-fetch';

const ROOT = path.resolve(__dirname, '..');

describe('promiseWithTimeout', () => {
  test('resolves when the promise settles before the deadline', async () => {
    await expect(promiseWithTimeout(Promise.resolve('ok'), 50, 'timed out')).resolves.toBe('ok');
  });

  test('rejects with the timeout message when the promise is slow', async () => {
    vi.useFakeTimers();
    const pending = promiseWithTimeout(
      new Promise<string>((resolve) => {
        setTimeout(() => resolve('late'), 100);
      }),
      25,
      'timed out',
    );
    const assertion = expect(pending).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(25);
    await assertion;
    vi.useRealTimers();
  });
});

describe('schedule overlay fetch UX', () => {
  test('schedule overlay timeout is 20 seconds', () => {
    expect(SCHEDULE_OVERLAY_FETCH_TIMEOUT_MS).toBe(20_000);
  });

  test('SecretaryTaskOverlay wraps dynamic overlays in Suspense fallbacks', () => {
    const overlay = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/secretary/_components/SecretaryTaskOverlay.tsx'),
      'utf-8',
    );

    expect(overlay).toContain('SecretaryOverlaySuspenseShell');
    expect(overlay).toMatch(/<Suspense[\s\S]*fallback=\{[\s\S]*SecretaryOverlaySuspenseShell/);
    expect(overlay).toContain('variant="purchase"');
    expect(overlay).toContain('variant="list"');
    expect(overlay).toContain('variant="form"');
  });
});
