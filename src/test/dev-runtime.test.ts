import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  getNotificationCatchUpLimit,
  NOTIFICATION_CATCH_UP_LIMIT_PRODUCTION,
  shouldSkipSecretaryAiSync,
} from '@/lib/dev-runtime';

describe('dev-runtime', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('shouldSkipSecretaryAiSync', () => {
    test('skips AI in development when not explicitly overridden', () => {
      vi.stubEnv('NODE_ENV', 'development');
      expect(shouldSkipSecretaryAiSync()).toBe(true);
      expect(shouldSkipSecretaryAiSync(undefined)).toBe(true);
    });

    test('allows forcing AI sync in development', () => {
      vi.stubEnv('NODE_ENV', 'development');
      expect(shouldSkipSecretaryAiSync(false)).toBe(false);
    });

    test('runs AI sync in production by default', () => {
      vi.stubEnv('NODE_ENV', 'production');
      expect(shouldSkipSecretaryAiSync()).toBe(false);
      expect(shouldSkipSecretaryAiSync(undefined)).toBe(false);
    });

    test('honors explicit skip in production', () => {
      vi.stubEnv('NODE_ENV', 'production');
      expect(shouldSkipSecretaryAiSync(true)).toBe(true);
    });
  });

  describe('getNotificationCatchUpLimit', () => {
    test('uses reduced limit in development', () => {
      vi.stubEnv('NODE_ENV', 'development');
      expect(getNotificationCatchUpLimit()).toBeLessThan(NOTIFICATION_CATCH_UP_LIMIT_PRODUCTION);
    });

    test('keeps production limit unchanged', () => {
      vi.stubEnv('NODE_ENV', 'production');
      expect(getNotificationCatchUpLimit()).toBe(NOTIFICATION_CATCH_UP_LIMIT_PRODUCTION);
    });
  });
});
