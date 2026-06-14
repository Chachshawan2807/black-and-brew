import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  clearInventoryQuickActionDraft,
  hydrateBulkQueueFromItems,
  loadInventoryQuickActionDraft,
  parseInventoryQuickActionDraft,
  saveInventoryQuickActionDraft,
  serializeInventoryQuickActionDraft,
  type InventoryQuickActionDraft,
} from '@/lib/inventory-quick-action-draft';
import type { BulkQueueItem, BulkStockItem } from '@/lib/inventory-quick-bulk';

const STORAGE_KEY = 'bb-inventory-quick-action-draft';

describe('inventory quick action draft persistence', () => {
  test('round-trips draft through JSON', () => {
    const draft: InventoryQuickActionDraft = {
      bulkMode: true,
      bulkQueue: [
        {
          itemId: 'a1',
          name: 'กาแฟ',
          unit: 'kg',
          currentStock: 5,
          qty: '2',
        },
      ],
      quickSearch: 'กาแฟ',
      quickQty: '2',
      quickType: 'IN',
    };

    const json = serializeInventoryQuickActionDraft(draft);
    expect(parseInventoryQuickActionDraft(json)).toEqual(draft);
  });

  test('hydrates current stock from latest items', () => {
    const queue: BulkQueueItem[] = [
      {
        itemId: 'a1',
        name: 'กาแฟ',
        unit: 'kg',
        currentStock: 1,
        qty: '3',
      },
    ];
    const items: BulkStockItem[] = [
      { id: 'a1', name: 'กาแฟอาราบิกา', stock: 9, unit: 'kg' },
    ];

    expect(hydrateBulkQueueFromItems(queue, items)).toEqual([
      {
        itemId: 'a1',
        name: 'กาแฟอาราบิกา',
        unit: 'kg',
        currentStock: 9,
        qty: '3',
      },
    ]);
  });

  test('drops bulk lines for deleted items on hydrate', () => {
    const queue: BulkQueueItem[] = [
      {
        itemId: 'gone',
        name: 'ลบแล้ว',
        unit: '',
        currentStock: 0,
        qty: '1',
      },
    ];

    expect(hydrateBulkQueueFromItems(queue, [])).toEqual([]);
  });

  test('save/load/clear uses sessionStorage key', () => {
    const store = new Map<string, string>();
    const sessionStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    };

    const draft: InventoryQuickActionDraft = {
      bulkMode: true,
      bulkQueue: [],
      quickSearch: 'นม',
      quickQty: '4',
      quickType: 'OUT',
    };

    saveInventoryQuickActionDraft(draft, sessionStorage);
    expect(store.get(STORAGE_KEY)).toBeTruthy();
    expect(loadInventoryQuickActionDraft(sessionStorage)).toEqual(draft);

    clearInventoryQuickActionDraft(sessionStorage);
    expect(loadInventoryQuickActionDraft(sessionStorage)).toBeNull();
  });
});

describe('inventory quick action refresh guard', () => {
  test('hook does not call router.refresh after save', () => {
    const hookCode = fs.readFileSync(
      path.resolve(__dirname, '../hooks/use-inventory-quick-action.ts'),
      'utf-8',
    );

    expect(hookCode).not.toMatch(/router\.refresh\(\)/);
    expect(hookCode).toContain('inventory-quick-action-draft');
  });
});
