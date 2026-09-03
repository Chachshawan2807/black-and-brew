import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

describe('secretary purchase order modal preload', () => {
  test('shared preload helper dedupes dynamic import', () => {
    const helper = fs.readFileSync(
      path.resolve(ROOT, 'lib/preload-purchase-orders-modal.ts'),
      'utf-8',
    );
    expect(helper).toContain("import('@/app/[locale]/inventory/_components/PurchaseOrdersModal')");
    expect(helper).toContain('createPreloadOnce');
  });

  test('SecretaryClient preloads purchase orders through shared overlay preload', () => {
    const client = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/secretary/SecretaryClient.tsx'),
      'utf-8',
    );
    expect(client).toContain('preloadSecretaryOverlayForTask');
    expect(client).toContain('scheduleIdleWork');
    expect(client).toContain('onPointerDown={canOpenDetail ? warmOverlayChunk : undefined}');
  });

  test('inventory client reuses shared preload helper', () => {
    const inventory = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/inventory/InventoryClient.tsx'),
      'utf-8',
    );
    expect(inventory).toContain("from '@/lib/preload-purchase-orders-modal'");
    expect(inventory).not.toMatch(/const preloadPurchaseOrdersModal = \(\) => \{/);
  });
});
