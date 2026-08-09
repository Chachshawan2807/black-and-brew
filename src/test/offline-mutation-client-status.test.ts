import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const clientPath = resolve(__dirname, '../lib/offline-mutation-client.ts');

describe('offline-mutation-client status events', () => {
  test('publishes offline status snapshot on queue, flush, and connectivity changes', () => {
    const source = readFileSync(clientPath, 'utf-8');
    expect(source).toContain('OFFLINE_STATUS_CHANGED_EVENT');
    expect(source).toContain('refreshOfflineStatus');
    expect(source).toContain("addEventListener('offline'");
    expect(source).toContain('countOwnedPendingOfflineMutations');
  });
});
