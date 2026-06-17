import { describe, expect, it } from 'vitest';

import {
  parseCreationOptionsFromJSON,
  parseRequestOptionsFromJSON,
  toJSON,
} from '@/lib/passkey/webauthn-json-polyfill';

function bytesToText(value: ArrayBuffer): string {
  return new TextDecoder().decode(value);
}

describe('webauthn json polyfill', () => {
  it('decodes creation options from base64url JSON', () => {
    const options = parseCreationOptionsFromJSON({
      challenge: 'Y2hhbGxlbmdl',
      rp: { id: 'example.com', name: 'Example' },
      user: {
        id: 'dXNlci0x',
        name: 'user@example.com',
        displayName: 'User One',
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      excludeCredentials: [
        {
          id: 'Y3JlZC0x',
          type: 'public-key',
          transports: ['internal'],
        },
      ],
    });

    expect(bytesToText(options.challenge)).toBe('challenge');
    expect(bytesToText(options.user.id)).toBe('user-1');
    expect(bytesToText(options.excludeCredentials?.[0]?.id as ArrayBuffer)).toBe('cred-1');
  });

  it('decodes request options from base64url JSON', () => {
    const options = parseRequestOptionsFromJSON({
      challenge: 'YXV0aC1jaGFsbGVuZ2U',
      rpId: 'example.com',
      allowCredentials: [
        {
          id: 'Y3JlZC0y',
          type: 'public-key',
          transports: ['internal'],
        },
      ],
    });

    expect(bytesToText(options.challenge)).toBe('auth-challenge');
    expect(bytesToText(options.allowCredentials?.[0]?.id as ArrayBuffer)).toBe('cred-2');
  });

  it('serializes assertion credentials to WebAuthn JSON', () => {
    const credential = {
      id: 'credential-id',
      rawId: new TextEncoder().encode('credential-id').buffer,
      response: {
        authenticatorData: new TextEncoder().encode('auth-data').buffer,
        clientDataJSON: new TextEncoder().encode('client-data').buffer,
        signature: new TextEncoder().encode('signature').buffer,
        userHandle: new TextEncoder().encode('user-handle').buffer,
      },
      authenticatorAttachment: 'platform',
      type: 'public-key',
    };

    expect(toJSON.call(credential)).toEqual({
      id: 'credential-id',
      rawId: 'Y3JlZGVudGlhbC1pZA',
      response: {
        authenticatorData: 'YXV0aC1kYXRh',
        clientDataJSON: 'Y2xpZW50LWRhdGE',
        signature: 'c2lnbmF0dXJl',
        userHandle: 'dXNlci1oYW5kbGU',
      },
      authenticatorAttachment: 'platform',
      clientExtensionResults: {},
      type: 'public-key',
    });
  });
});
