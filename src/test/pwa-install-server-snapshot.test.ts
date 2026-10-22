import { describe, expect, test } from 'vitest';
import { getInstallStoreServerSnapshot } from '@/hooks/use-pwa-install';

describe('PWA install external store', () => {
  test('reuses the same server snapshot object between reads', () => {
    expect(getInstallStoreServerSnapshot()).toBe(getInstallStoreServerSnapshot());
  });
});
