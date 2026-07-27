import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  FREQUENT_ITEMS_CACHE_KEY,
  FREQUENT_ITEMS_LIMIT,
  loadFrequentItemsCache,
  rankFrequentItemIds,
  saveFrequentItemsCache,
  resolveFrequentItemNames,
  touchFrequentItemInCache,
} from '@/lib/inventory-frequent-items';

describe('inventory frequent items ranking', () => {
  test('ranks item ids by transaction frequency and keeps top N', () => {
    const ranked = rankFrequentItemIds(
      [
        { inventory_item_id: 'a' },
        { inventory_item_id: 'b' },
        { inventory_item_id: 'a' },
        { inventory_item_id: 'c' },
        { inventory_item_id: 'a' },
        { inventory_item_id: 'b' },
        { inventory_item_id: null },
      ],
      2,
    );
    expect(ranked).toEqual(['a', 'b']);
  });

  test('defaults to seven frequent items', () => {
    expect(FREQUENT_ITEMS_LIMIT).toBe(7);
    const rows = Array.from({ length: 12 }, (_, i) => ({
      inventory_item_id: `id-${i}`,
    }));
    expect(rankFrequentItemIds(rows)).toHaveLength(7);
  });

  test('resolves names from already-loaded inventory items without a second map lookup miss', () => {
    const resolved = resolveFrequentItemNames(
      ['b', 'a', 'missing'],
      [
        { id: 'a', name: 'Alpha' },
        { id: 'b', name: 'Beta' },
      ],
    );
    expect(resolved).toEqual([
      { id: 'b', name: 'Beta' },
      { id: 'a', name: 'Alpha' },
    ]);
  });
});

describe('inventory frequent items local cache', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
  });

  test('round-trips frequent items through versioned localStorage cache', () => {
    const items = [
      { id: '1', name: 'Milk' },
      { id: '2', name: 'Beans' },
    ];
    saveFrequentItemsCache(items);
    expect(loadFrequentItemsCache()).toEqual(items);
    expect(localStorage.getItem(FREQUENT_ITEMS_CACHE_KEY)).toContain('"v":1');
  });

  test('caps cache and touch updates at seven items', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      name: `Item ${i}`,
    }));
    saveFrequentItemsCache(many);
    expect(loadFrequentItemsCache()).toHaveLength(7);

    const touched = touchFrequentItemInCache({ id: 'new', name: 'New' });
    expect(touched).toHaveLength(7);
    expect(touched[0]).toEqual({ id: 'new', name: 'New' });
  });

  test('returns empty when cache payload is invalid', () => {
    localStorage.setItem(FREQUENT_ITEMS_CACHE_KEY, '{not-json');
    expect(loadFrequentItemsCache()).toEqual([]);
  });
});

describe('frequent items UX contracts', () => {
  test('FAB preloads frequent items on mount and soft-refreshes inventory when already loaded', () => {
    const fabCode = fs.readFileSync(
      path.resolve(__dirname, '../app/[locale]/inventory/_components/InventoryQuickActionFAB.tsx'),
      'utf-8',
    );
    const contextCode = fs.readFileSync(
      path.resolve(__dirname, '../contexts/InventoryRealtimeContext.tsx'),
      'utf-8',
    );

    expect(fabCode).toContain('loadFrequentItemsCache');
    expect(fabCode).toContain('saveFrequentItemsCache');
    expect(fabCode).toMatch(/useEffect\([\s\S]*loadFrequentItems[\s\S]*\[\s*isMounted\s*,\s*loadFrequentItems\s*\]/);
    expect(fabCode).toMatch(/refresh\(\s*\{\s*soft:/);
    expect(contextCode).toMatch(/soft\s*[?:]|options\?\.soft|soft\?:/);
  });

  test('fetchFrequentItems uses ranking helper and resolves names in one pass', () => {
    const actions = fs.readFileSync(
      path.resolve(__dirname, '../app/actions/inventory-actions.ts'),
      'utf-8',
    );
    expect(actions).toContain('rankFrequentItemIds');
    expect(actions).toContain('resolveFrequentItemNames');
  });
});
