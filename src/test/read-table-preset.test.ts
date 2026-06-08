import { describe, test, expect, vi, beforeEach } from 'vitest';

/**
 * DEC-069 — readTableTool must enforce TABLE_COLUMN_PRESETS and ignore any
 * AI-supplied `columns`. Because the tool runs through the Service Role
 * adminClient (RLS bypass), letting the model pick arbitrary columns is a
 * data-exfiltration vector (e.g. requesting sensitive columns on `profiles`).
 *
 * AI-GATEWAY-P3 — reads now flow through src/lib/ai-data-gateway.ts:
 *   - inventory_items + no filters → get_ai_store_status RPC (no raw select)
 *   - everything else → fetchTablePreset (preset-locked select)
 */

const captured = { select: '', rpc: '' };

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
      resolve({ data: [], error: null }),
  });

  return {
    createClient: vi.fn(() => ({
      from: vi.fn(() => builder),
      rpc: vi.fn((fn: string) => {
        captured.rpc = fn;
        return Promise.resolve({
          data: { inventory_summary: [], low_stock_items: [] },
          error: null,
        });
      }),
    })),
  };
});

import { readTableTool } from '@/app/actions/tools/database-tools';

const INVENTORY_PRESET =
  'id, name, unit, source, order_point, target_stock, stock, order_qty, updated_at';
const PROFILES_PRESET = 'id, full_name, schedule_order';

async function runReadTable(input: Record<string, unknown>) {
  // `tool()` preserves the provided execute fn; second arg (ToolCallOptions) is unused here.
  return (readTableTool as unknown as {
    execute: (i: Record<string, unknown>) => Promise<unknown>;
  }).execute(input);
}

describe('readTableTool — preset column enforcement', () => {
  beforeEach(() => {
    captured.select = '';
    captured.rpc = '';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  test('ignores AI-supplied columns and always uses the table preset', async () => {
    await runReadTable({
      tableName: 'profiles',
      columns: 'id, secret_salary_column, login_password',
    });

    expect(captured.select).toBe(PROFILES_PRESET);
  });

  test('uses the preset when no columns are provided', async () => {
    await runReadTable({ tableName: 'profiles' });

    expect(captured.select).toBe(PROFILES_PRESET);
  });

  test('inventory_items + filters stays preset-locked (never selects outside preset)', async () => {
    await runReadTable({
      tableName: 'inventory_items',
      columns: 'id, supplier_secret',
      filters: { source: 'Makro' },
    });

    expect(captured.select).toBe(INVENTORY_PRESET);
  });

  test('inventory_items + no filters routes through the gateway RPC, not a raw select', async () => {
    await runReadTable({ tableName: 'inventory_items' });

    expect(captured.rpc).toBe('get_ai_store_status');
    expect(captured.select).toBe('');
  });
});
