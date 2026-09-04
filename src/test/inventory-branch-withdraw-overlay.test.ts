import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { mapSecretaryReorderItemsToInventoryRealtime } from '@/lib/inventory-branch-withdraw-seed';

const ROOT = path.resolve(__dirname, '..');

describe('inventory branch withdraw overlay', () => {
  test('maps secretary snapshot rows into inventory realtime shape', () => {
    const mapped = mapSecretaryReorderItemsToInventoryRealtime([
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'เมล็ดกาแฟ',
        source: 'สาขา 2',
        stock: 12,
        order_qty: 0,
        order_point: 5,
        target_stock: 20,
        unit: 'kg',
        sort_order: 3,
        computedOrderQty: 8,
      },
    ]);

    expect(mapped[0]).toMatchObject({
      id: '11111111-1111-1111-1111-111111111111',
      name: 'เมล็ดกาแฟ',
      stock: 12,
      source: 'สาขา 2',
      sort_order: 3,
    });
  });

  test('overlay renders client immediately with snapshot seed and delegates mobile shell', () => {
    const overlay = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/secretary/_components/BranchWithdrawOverlay.tsx'),
      'utf-8',
    );
    expect(overlay).toContain('seedItems');
    expect(overlay).toContain('catalogSeedItems');
    expect(overlay).toContain('hasCatalogSeed');
    expect(overlay).toContain('mapSecretaryReorderItemsToInventoryRealtime');
    expect(overlay).not.toContain('dynamic(');
    expect(overlay).toContain('SecretaryTaskSubwindow');
    expect(overlay).toContain('embedded');
  });

  test('branch withdraw uses scroll body with fixed add bar and in-scroll action bar', () => {
    const client = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/inventory/branch-withdraw/BranchWithdrawClient.tsx'),
      'utf-8',
    );
    expect(client).toContain('BRANCH_WITHDRAW_SCROLL_BODY_CLASS');
    expect(client).toContain('branch-withdraw-layout');
    expect(client).toContain('BRANCH_WITHDRAW_STANDALONE_MOBILE_SHELL_CLASS');
    expect(client).toContain('useVisualViewportInsets');
    expect(client).not.toContain('h-[100dvh] flex-col overflow-hidden');
    expect(client).not.toContain('STANDALONE_ADD_FROM_CATALOG_BAR_CLASS');
    expect(client).not.toMatch(/sticky top-0 z-10 border-b border-border bg-background\/95/);
  });

  test('summary and save action bar sits above withdrawal history in scroll region', () => {
    const client = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/inventory/branch-withdraw/BranchWithdrawClient.tsx'),
      'utf-8',
    );
    expect(client).toMatch(/\{actionBar\}[\s\S]*ประวัติการเบิก/);
    expect(client).not.toMatch(
      /<div className=\{BRANCH_WITHDRAW_SCROLL_BODY_CLASS\}>[\s\S]*?<\/div>\s*\{actionBar\}/,
    );
  });

  test('save draft is local checkpoint and receive posts to server', () => {
    const client = fs.readFileSync(
      path.resolve(ROOT, 'app/[locale]/inventory/branch-withdraw/BranchWithdrawClient.tsx'),
      'utf-8',
    );
    expect(client).toContain('handleSaveDraft');
    expect(client).toContain('handleReceive');
    expect(client).toContain('saveBranchWithdrawDraftCheckpoint');
    expect(client).toContain('PackagePlus');
    expect(client).toContain('รับเข้า');
    expect(client).toContain('writeBranchWithdrawDraft(window.localStorage');
    expect(client).not.toMatch(/onClick=\{\(\) => void handleSave\(\)\}/);
    expect(client).toContain('saveBranchWithdrawal');
  });
});
