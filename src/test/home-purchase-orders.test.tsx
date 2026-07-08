import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import HomePurchaseOrdersSection from '@/app/[locale]/_components/HomePurchaseOrdersSection';
import { InventoryRealtimeProvider } from '@/contexts/InventoryRealtimeContext';

vi.mock('@/lib/supabase-session', () => ({
  ensureSupabaseSession: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/components/sidebar/NavPreloadLink', () => ({
  NavPreloadLink: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const lowStockItems = [
  {
    id: '1',
    name: 'เมล็ดกาแฟ',
    stock: 2,
    order_point: 10,
    target_stock: 20,
    unit: 'kg',
    source: 'Makro',
    sort_order: 1,
  },
  {
    id: '2',
    name: 'นมสด',
    stock: 15,
    order_point: 10,
    target_stock: 20,
    unit: 'ลิตร',
    source: 'Tops',
    sort_order: 2,
  },
];

function renderSection(items = lowStockItems) {
  return render(
    <InventoryRealtimeProvider>
      <HomePurchaseOrdersSection initialItems={items} locale="th" />
    </InventoryRealtimeProvider>,
  );
}

describe('HomePurchaseOrdersSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('shows empty state when no items need reorder', () => {
    renderSection([
      {
        id: 'ok',
        name: 'พอแล้ว',
        stock: 20,
        order_point: 10,
        target_stock: 30,
        unit: 'ชิ้น',
        source: 'Makro',
        sort_order: 1,
      },
    ]);

    expect(screen.getByText('ไม่มีรายการที่ต้องสั่งซื้อ')).toBeInTheDocument();
    expect(screen.getByText('0 รายการ')).toBeInTheDocument();
  });

  test('lists low-stock items and links to inventory', () => {
    renderSection();

    expect(screen.getByRole('heading', { name: 'รายการที่ต้องสั่งซื้อ' })).toBeInTheDocument();
    expect(screen.getByText('1 รายการ')).toBeInTheDocument();
    expect(screen.getAllByText('เมล็ดกาแฟ').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /คลังสินค้า/i })).toHaveAttribute('href', '/th/inventory');
  });

  test('renders source filter tabs when multiple sources need reorder', () => {
    renderSection([
      ...lowStockItems,
      {
        id: '3',
        name: 'แก้ว',
        stock: 0,
        order_point: 5,
        target_stock: 10,
        unit: 'ใบ',
        source: 'Tops',
        sort_order: 3,
      },
    ]);

    expect(screen.getByText('2 รายการ')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ทั้งหมด/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Makro/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tops/i })).toBeInTheDocument();
  });
});
