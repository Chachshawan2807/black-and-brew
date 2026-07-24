import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import HomeOpsPanels from '@/app/[locale]/_components/HomeOpsPanels';
import HomeMaintenanceDueSection from '@/app/[locale]/_components/HomeMaintenanceDueSection';
import { InventoryRealtimeProvider } from '@/contexts/InventoryRealtimeContext';
import type { UpcomingMaintenanceTask } from '@/lib/maintenance/types';

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
];

const maintenanceTasks: UpcomingMaintenanceTask[] = [
  {
    id: 'm1',
    equipment: 'เครื่องกรองน้ำ',
    advice: 'เปลี่ยนไส้กรองหยาบ',
    dueDate: '2026-07-04',
    urgency: 'overdue',
  },
];

function renderOpsPanels() {
  return render(
    <InventoryRealtimeProvider>
      <HomeOpsPanels
        initialItems={lowStockItems}
        maintenanceTasks={maintenanceTasks}
        locale="th"
      />
    </InventoryRealtimeProvider>,
  );
}

describe('HomeOpsPanels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('shows tab counts and switches active tab to maintenance', () => {
    renderOpsPanels();

    expect(screen.getByRole('tab', { name: /สั่งซื้อ/ })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: /ซ่อมบำรุง/ }));

    expect(screen.getByRole('tab', { name: /ซ่อมบำรุง/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByText('เครื่องกรองน้ำ').length).toBeGreaterThanOrEqual(1);
  });

  test('renders purchase and maintenance sections in the page', () => {
    renderOpsPanels();

    expect(
      screen.getAllByRole('heading', { name: 'รายการที่ต้องสั่งซื้อ' }).length,
    ).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole('tab', { name: /ซ่อมบำรุง/ }));

    expect(
      screen.getAllByRole('heading', { name: 'รายการซ่อมบำรุงที่ต้องทำภายใน 1 เดือน' }).length,
    ).toBeGreaterThanOrEqual(1);
  });
});

describe('HomeMaintenanceDueSection', () => {
  test('shows empty state when no maintenance tasks are due within one month', () => {
    render(
      <HomeMaintenanceDueSection tasks={[]} locale="th" />,
    );

    expect(
      screen.getByText('ไม่มีรายการซ่อมบำรุงที่ต้องทำภายใน 1 เดือน'),
    ).toBeInTheDocument();
  });
});
