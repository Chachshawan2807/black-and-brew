import { describe, expect, test, vi, beforeEach } from 'vitest';

const mockRows: Record<string, unknown>[] = [];
const captured = { table: '', select: '', filters: [] as Array<{ key: string; value: unknown }> };

vi.mock('@supabase/supabase-js', () => {
  const builder: Record<string, unknown> = {};
  Object.assign(builder, {
    select: vi.fn((cols: string) => {
      captured.select = cols;
      return builder;
    }),
    limit: vi.fn(() => builder),
    eq: vi.fn((key: string, value: unknown) => {
      captured.filters.push({ key, value });
      return builder;
    }),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    is: vi.fn(() => builder),
    order: vi.fn(() => builder),
    then: (resolve: (v: { data: unknown[]; error: null }) => void) =>
      resolve({ data: mockRows, error: null }),
  });

  return {
    createClient: vi.fn(() => ({
      from: vi.fn((table: string) => {
        captured.table = table;
        return builder;
      }),
      rpc: vi.fn(),
    })),
  };
});

vi.mock('@/lib/policies/server-gate', () => ({
  requirePrivilegedSession: vi.fn(async () => ({
    ok: true as const,
    readOnly: false,
    userId: 'user-1',
  })),
}));

import {
  AI_ALLOWED_TABLES,
  TABLE_COLUMN_PRESETS,
  TABLE_MAX_LIMITS,
  fetchBeanOrdersSummary,
  isAiReadableTable,
} from '@/lib/ai-data-gateway';

beforeEach(() => {
  mockRows.length = 0;
  captured.table = '';
  captured.select = '';
  captured.filters = [];
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
});

describe('bean orders AI gateway', () => {
  test('allows all six bean-order tables with presets', () => {
    const beanTables = [
      'bean_customers',
      'bean_customer_addresses',
      'bean_orders',
      'bean_order_lines',
      'bean_order_payments',
      'bean_order_shipments',
    ] as const;

    for (const table of beanTables) {
      expect(AI_ALLOWED_TABLES).toContain(table);
      expect(isAiReadableTable(table)).toBe(true);
      expect(TABLE_COLUMN_PRESETS[table]).toBeTruthy();
      expect(TABLE_MAX_LIMITS[table]).toBeGreaterThan(0);
    }

    // No slip URLs or tracking_raw blobs in presets
    expect(TABLE_COLUMN_PRESETS.bean_order_payments).not.toContain('slip_url');
    expect(TABLE_COLUMN_PRESETS.bean_order_shipments).not.toContain('tracking_raw');
  });

  test('fetchBeanOrdersSummary aggregates unpaid and pending fulfillment', async () => {
    mockRows.push(
      {
        order_no: 'BO-001',
        recipient_name: 'คุณเอ',
        total_baht: 1200,
        payment_status: 'unpaid',
        fulfillment_status: 'pending',
        cancelled_at: null,
        created_at: '2026-07-20T00:00:00Z',
      },
      {
        order_no: 'BO-002',
        recipient_name: 'คุณบี',
        total_baht: 800,
        payment_status: 'paid',
        fulfillment_status: 'pending',
        cancelled_at: null,
        created_at: '2026-07-21T00:00:00Z',
      },
      {
        order_no: 'BO-003',
        recipient_name: 'คุณซี',
        total_baht: 500,
        payment_status: 'paid',
        fulfillment_status: 'shipped',
        cancelled_at: null,
        created_at: '2026-07-22T00:00:00Z',
      },
    );

    const result = await fetchBeanOrdersSummary({ days: 30 });

    expect(result.ok).toBe(true);
    expect(captured.table).toBe('bean_orders');
    expect(captured.select).toBe(TABLE_COLUMN_PRESETS.bean_orders);
    expect(result.total_orders).toBe(3);
    expect(result.unpaid_count).toBe(1);
    expect(result.pending_ship_count).toBe(2);
    expect(result.unpaid_total_baht).toBe(1200);
    expect(result.open_orders).toHaveLength(2);
    expect(result.open_orders[0]?.order_no).toBe('BO-001');
  });
});
