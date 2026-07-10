import { describe, expect, test } from 'vitest';
import { computeActiveLoginSessions } from '@/lib/login-session-status';
import type { LoginHistoryRow } from '@/app/actions/login-history-actions';

function row(
  overrides: Partial<LoginHistoryRow> & { session_fingerprint: string; event_type: LoginHistoryRow['event_type'] }
): LoginHistoryRow {
  return {
    id: overrides.id ?? '1',
    occurred_at: overrides.occurred_at ?? '2026-06-12T10:00:00.000Z',
    ip_address: null,
    device_type: 'mobile',
    device_vendor: 'Apple',
    device_model: 'iPhone',
    os_name: 'iOS',
    os_version: null,
    browser_name: 'Safari',
    browser_version: null,
    access_level: 'full',
    status: 'success',
    failure_reason: null,
    metadata: {},
    ...overrides,
  };
}

describe('computeActiveLoginSessions', () => {
  test('returns devices whose latest event is login_success', () => {
    const sessions = computeActiveLoginSessions(
      [
        row({
          session_fingerprint: 'fp-a',
          event_type: 'logout',
          occurred_at: '2026-06-12T11:00:00.000Z',
        }),
        row({
          session_fingerprint: 'fp-b',
          event_type: 'login_success',
          occurred_at: '2026-06-12T10:30:00.000Z',
        }),
        row({
          session_fingerprint: 'fp-a',
          event_type: 'login_success',
          occurred_at: '2026-06-12T10:00:00.000Z',
        }),
      ],
      'fp-b'
    );

    expect(sessions).toHaveLength(1);
    expect(sessions[0].sessionFingerprint).toBe('fp-b');
    expect(sessions[0].isCurrentDevice).toBe(true);
  });

  test('excludes revoked fingerprints even when latest event is login_success', () => {
    const sessions = computeActiveLoginSessions(
      [
        row({
          session_fingerprint: 'fp-revoked',
          event_type: 'login_success',
          occurred_at: '2026-06-12T11:00:00.000Z',
        }),
        row({
          session_fingerprint: 'fp-ok',
          event_type: 'login_success',
          occurred_at: '2026-06-12T10:30:00.000Z',
        }),
      ],
      'fp-ok',
      new Set(['fp-revoked'])
    );

    expect(sessions).toHaveLength(1);
    expect(sessions[0].sessionFingerprint).toBe('fp-ok');
  });
});
