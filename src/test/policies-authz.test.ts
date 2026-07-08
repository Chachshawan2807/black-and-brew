import { describe, expect, test } from 'vitest';
import {
  canAccessPrivileged,
  canMutate,
  canRead,
  evaluateAuthz,
  subjectFromServerAuth,
} from '@/lib/policies/authz';
import { READ_ONLY_DENY_MSG } from '@/lib/policies/messages';

const UNAUTHORIZED = 'Unauthorized: Session missing or invalid';

describe('evaluateAuthz', () => {
  test('denies unauthenticated read', () => {
    expect(evaluateAuthz({ verified: false, readOnly: false }, 'read')).toEqual({
      allow: false,
      reason: UNAUTHORIZED,
    });
  });

  test('allows read-only session to read', () => {
    expect(evaluateAuthz({ verified: true, readOnly: true }, 'read')).toEqual({
      allow: true,
    });
  });

  test('allows full session to read', () => {
    expect(evaluateAuthz({ verified: true, readOnly: false }, 'read')).toEqual({
      allow: true,
    });
  });

  test('denies read-only session for mutate', () => {
    expect(evaluateAuthz({ verified: true, readOnly: true }, 'mutate')).toEqual({
      allow: false,
      reason: READ_ONLY_DENY_MSG,
    });
  });

  test('allows full session to mutate', () => {
    expect(evaluateAuthz({ verified: true, readOnly: false }, 'mutate')).toEqual({
      allow: true,
    });
  });

  test('denies read-only session for privileged (AI chat)', () => {
    expect(evaluateAuthz({ verified: true, readOnly: true }, 'privileged')).toEqual({
      allow: false,
      reason: READ_ONLY_DENY_MSG,
    });
  });
});

describe('policy helpers', () => {
  test('canRead reflects verified flag only', () => {
    expect(canRead({ verified: true, readOnly: true })).toBe(true);
    expect(canRead({ verified: false, readOnly: false })).toBe(false);
  });

  test('canMutate requires full access', () => {
    expect(canMutate({ verified: true, readOnly: false })).toBe(true);
    expect(canMutate({ verified: true, readOnly: true })).toBe(false);
  });

  test('canAccessPrivileged matches mutate for PIN sessions', () => {
    expect(canAccessPrivileged({ verified: true, readOnly: false })).toBe(true);
    expect(canAccessPrivileged({ verified: true, readOnly: true })).toBe(false);
  });

  test('subjectFromServerAuth maps ok session', () => {
    expect(subjectFromServerAuth({ ok: true, readOnly: true, userId: 'u1' })).toEqual({
      verified: true,
      readOnly: true,
      userId: 'u1',
    });
  });
});
