import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  host: 'localhost:3000',
  proto: 'http',
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: (name: string) => {
      if (name === 'host') return mocks.host;
      if (name === 'x-forwarded-proto') return mocks.proto;
      return null;
    },
  })),
}));

import { resolveWebAuthnContext } from '@/lib/passkey/webauthn-origin';

describe('resolveWebAuthnContext', () => {
  beforeEach(() => {
    mocks.host = 'localhost:3000';
    mocks.proto = 'http';
  });

  test('preserves localhost port in expected origin while using localhost rpId', async () => {
    await expect(resolveWebAuthnContext()).resolves.toEqual({
      rpId: 'localhost',
      origin: 'http://localhost:3000',
    });
  });
});
