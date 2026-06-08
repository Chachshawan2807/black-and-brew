import { describe, test, expect, vi, beforeEach } from 'vitest';

/**
 * AI-GATEWAY-P3 — src/lib/ai-data-gateway.ts is the single doorway for every
 * AI read against Supabase. It must:
 *   1. only ever SELECT the table's preset columns (DEC-069),
 *   2. route store status through the get_ai_store_status RPC,
 *   3. delegate daily shifts to the canonical fetchDailyShiftsByDate.
 */

const captured = { table: '', select: '', rpc: '' };

vi.mock('@supabase/supabase-js', () => {
  const builder: Record<string, unknown> = {};
  Object.assign(builder, {
    select: vi.fn((cols: string) => {
      captured.select = cols;
      return builder;
    }),
    limit: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    then: (resolve: (v: { data: unknown[]; error: null }) => void) =>
      resolve({ data: [{ id: '1', name: 'Beans' }], error: null }),
  });

  return {
    createClient: vi.fn(() => ({
      from: vi.fn((table: string) => {
        captured.table = table;
        return builder;
      }),
      rpc: vi.fn((fn: string) => {
        captured.rpc = fn;
        return Promise.resolve({
          data: {
            timestamp: '2026-06-09T00:00:00Z',
            shifts: [],
            inventory_summary: [{ name: 'Beans', stock: 2, status: 'LOW' }],
            low_stock_items: [{ name: 'Beans', stock: 2, status: 'LOW' }],
          },
          error: null,
        });
      }),
    })),
  };
});

vi.mock('@/lib/schedule/fetch-daily-shifts', () => ({
  fetchDailyShiftsByDate: vi.fn(async (date: string) => ({
    date,
    front_store: [],
    other_duty: [],
    off_or_leave: [],
    all_staff: [],
  })),
}));

import {
  fetchTablePreset,
  fetchInventorySummary,
  fetchShiftsByDate,
  TABLE_COLUMN_PRESETS,
} from '@/lib/ai-data-gateway';
import { fetchDailyShiftsByDate } from '@/lib/schedule/fetch-daily-shifts';

beforeEach(() => {
  captured.table = '';
  captured.select = '';
  captured.rpc = '';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
});

describe('fetchTablePreset', () => {
  test('selects exactly the preset columns and returns preset-shaped rows', async () => {
    const result = await fetchTablePreset('inventory_items');

    expect(captured.select).toBe(TABLE_COLUMN_PRESETS.inventory_items);
    expect(result.ok).toBe(true);
    expect(result.rows).toEqual([{ id: '1', name: 'Beans' }]);
  });

  test('rejects tables without a preset', async () => {
    const result = await fetchTablePreset('secret_audit_table');
    expect(result.ok).toBe(false);
    expect(captured.select).toBe('');
  });

  test('applies equality filters via the real column name', async () => {
    const result = await fetchTablePreset('profiles', { name: 'Tar' });
    expect(captured.select).toBe(TABLE_COLUMN_PRESETS.profiles);
    expect(result.ok).toBe(true);
  });
});

describe('fetchInventorySummary', () => {
  test('routes through the get_ai_store_status RPC, never a raw select', async () => {
    const status = await fetchInventorySummary();

    expect(captured.rpc).toBe('get_ai_store_status');
    expect(captured.select).toBe('');
    expect(status.inventory_summary?.[0]).toMatchObject({ name: 'Beans' });
    expect(status.low_stock_items).toHaveLength(1);
  });
});

describe('fetchShiftsByDate', () => {
  test('delegates to fetchDailyShiftsByDate', async () => {
    const result = await fetchShiftsByDate('2026-06-09');
    expect(fetchDailyShiftsByDate).toHaveBeenCalledWith('2026-06-09');
    expect(result.date).toBe('2026-06-09');
  });
});
