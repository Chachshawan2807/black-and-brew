import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  getNotificationCatchUpLimit,
  NOTIFICATION_CATCH_UP_LIMIT_PRODUCTION,
} from '@/lib/dev-runtime';

describe('dev-runtime', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
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
