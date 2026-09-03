import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mockFrom = vi.fn();
const mockRequireReadAccess = vi.fn();

vi.mock('@/lib/policies/server-gate', () => ({
  requireReadAccess: () => mockRequireReadAccess(),
  gateMutation: () => Promise.resolve({ success: true }),
  requireMutationAccess: () => Promise.resolve(null),
}));

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: () => ({
    from: mockFrom,
    storage: {
      from: () => ({
        createSignedUrl: () =>
          Promise.resolve({ data: { signedUrl: 'https://signed' }, error: null }),
      }),
    },
  }),
}));

/** Chainable query-builder stub: every method returns the same thenable chain. */
function makeChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const ret = () => chain;
  chain.select = vi.fn(ret);
  chain.eq = vi.fn(ret);
  chain.order = vi.fn(ret);
  chain.limit = vi.fn(ret);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  chain.then = (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onF, onR);
  return chain;
}

function routeTables(results: {
  bean_orders: { data: unknown; error: unknown };
  bean_order_lines?: { data: unknown; error: unknown };
  bean_order_payments?: { data: unknown; error: unknown };
  bean_order_shipments?: { data: unknown; error: unknown };
}) {
  const empty = { data: [], error: null };
  const emptyRow = { data: null, error: null };
  mockFrom.mockImplementation((table: string) => {
    switch (table) {
      case 'bean_orders':
        return makeChain(results.bean_orders);
      case 'bean_order_lines':
        return makeChain(results.bean_order_lines ?? empty);
      case 'bean_order_payments':
        return makeChain(results.bean_order_payments ?? emptyRow);
      case 'bean_order_shipments':
        return makeChain(results.bean_order_shipments ?? emptyRow);
      default:
        return makeChain(emptyRow);
    }
  });
}

const ORDER_ROW = {
  id: 'order-1',
  order_no: 'BO-20260903-1',
  customer_id: null,
  bean_customers: { name: 'คุณลี' },
  recipient_name: 'คุณลี',
  recipient_address: '123/4',
  subtotal_baht: 100,
  discount_baht: 0,
  shipping_baht: 0,
  total_baht: 100,
  payment_status: 'unpaid',
  fulfillment_status: 'pending',
  status_history: [],
  created_at: '2026-09-03T00:00:00.000Z',
};

describe('fetchBeanOrderDetail resilience (blank detail regression)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireReadAccess.mockResolvedValue(null);
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
  });

  test('genuine missing order reports notFound: true', async () => {
    routeTables({ bean_orders: { data: null, error: null } });
    const { fetchBeanOrderDetail } = await import('@/app/actions/bean-order-actions');
    const result = await fetchBeanOrderDetail('missing-id');

    expect(result.success).toBe(false);
    expect(result.notFound).toBe(true);
  }, 30000);

  test('transient DB error does NOT report notFound (so page can retry, not blank 404)', async () => {
    routeTables({
      bean_orders: { data: null, error: { message: 'timeout', details: 'network' } },
    });
    const { fetchBeanOrderDetail } = await import('@/app/actions/bean-order-actions');
    const result = await fetchBeanOrderDetail('order-1');

    expect(result.success).toBe(false);
    expect(result.notFound).toBe(false);
    expect(result.error).toBeTruthy();
  }, 30000);

  test('auth/read-access failure does NOT report notFound', async () => {
    mockRequireReadAccess.mockResolvedValue('Unauthorized: Session missing or invalid');
    routeTables({ bean_orders: { data: ORDER_ROW, error: null } });
    const { fetchBeanOrderDetail } = await import('@/app/actions/bean-order-actions');
    const result = await fetchBeanOrderDetail('order-1');

    expect(result.success).toBe(false);
    expect(result.notFound).toBe(false);
  }, 30000);

  test('successful fetch returns data without notFound', async () => {
    routeTables({ bean_orders: { data: ORDER_ROW, error: null } });
    const { fetchBeanOrderDetail } = await import('@/app/actions/bean-order-actions');
    const result = await fetchBeanOrderDetail('order-1');

    expect(result.success).toBe(true);
    expect(result.notFound).toBeFalsy();
    expect(result.data?.orderNo).toBe('BO-20260903-1');
  }, 30000);
});

describe('bean-order pages surface transient errors instead of blank 404', () => {
  const ROOT = resolve(__dirname, '..');
  const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8');

  test('detail page notFounds only genuine misses and throws on transient error', () => {
    const src = read('app/[locale]/bean-orders/[id]/page.tsx');
    expect(src).toMatch(/if\s*\(\s*result\.notFound\s*\)\s*notFound\(\)/);
    expect(src).toMatch(/throw new Error\(/);
    // The old blanket "!success -> notFound" pattern must be gone.
    expect(src).not.toMatch(/if\s*\(\s*!result\.success\s*\|\|\s*!result\.data\s*\)\s*notFound\(\)/);
  });

  test('edit page notFounds only genuine misses and throws on transient error', () => {
    const src = read('app/[locale]/bean-orders/[id]/edit/page.tsx');
    expect(src).toMatch(/if\s*\(\s*orderResult\.notFound\s*\)\s*notFound\(\)/);
    expect(src).toMatch(/throw new Error\(/);
    expect(src).not.toMatch(
      /if\s*\(\s*!orderResult\.success\s*\|\|\s*!orderResult\.data\s*\)\s*notFound\(\)/,
    );
  });

  test('bean-orders detail segment has a styled not-found boundary', () => {
    const src = read('app/[locale]/bean-orders/[id]/not-found.tsx');
    expect(src).toContain('bean-orders');
    expect(src).toMatch(/ไม่พบ/);
  });
});
