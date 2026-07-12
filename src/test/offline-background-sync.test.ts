import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const swPath = resolve(__dirname, '../../public/sw.js');
const pwaRegisterPath = resolve(__dirname, '../components/PwaRegister.tsx');

describe('offline background sync wiring', () => {
  test('service worker registers offline mutation sync tag and store', () => {
    const source = readFileSync(swPath, 'utf-8');
    expect(source).toContain("importScripts('/offline-mutation-store.js')");
    expect(source).toContain("event.tag !== OFFLINE_MUTATION_SYNC_TAG");
    expect(source).toContain('/api/inventory/offline-mutation');
    expect(source).toContain("type: 'FLUSH_OFFLINE_MUTATIONS'");
  });

  test('PwaRegister installs offline mutation listeners globally', () => {
    const source = readFileSync(pwaRegisterPath, 'utf-8');
    expect(source).toContain('installOfflineMutationListeners');
  });

  test('PwaRegister blocks cross-origin notification navigation', () => {
    const source = readFileSync(pwaRegisterPath, 'utf-8');
    expect(source).toContain('resolveSameOriginNavigationUrl');
    expect(source).toContain('blocked cross-origin notification navigation');
  });
});
