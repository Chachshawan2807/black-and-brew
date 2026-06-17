import { describe, expect, test } from 'vitest';
import {
  normalizeRpId,
  resolveOriginFromHost,
  resolveRpIdFromHostname,
} from '@/lib/passkey/webauthn-origin';
import { fingerprintToPasskeyUserId } from '@/lib/passkey/passkey-user-id';

describe('passkey webauthn origin', () => {
  test('normalizes localhost hostnames to localhost rpId', () => {
    expect(normalizeRpId('127.0.0.1')).toBe('localhost');
    expect(normalizeRpId('localhost')).toBe('localhost');
  });

  test('uses WEBAUTHN_RP_ID when set', () => {
    const prev = process.env.WEBAUTHN_RP_ID;
    process.env.WEBAUTHN_RP_ID = 'erp.blackandbrew.com';
    expect(resolveRpIdFromHostname('preview.vercel.app')).toBe('erp.blackandbrew.com');
    process.env.WEBAUTHN_RP_ID = prev;
  });

  test('builds origin from host for production', () => {
    expect(resolveOriginFromHost('erp.example.com', 'https')).toBe('https://erp.example.com');
  });
});

describe('fingerprintToPasskeyUserId', () => {
  test('returns stable 32-byte user id for same fingerprint', () => {
    const a = fingerprintToPasskeyUserId('device-a');
    const b = fingerprintToPasskeyUserId('device-a');
    const c = fingerprintToPasskeyUserId('device-b');
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a.byteLength).toBe(32);
  });
});
