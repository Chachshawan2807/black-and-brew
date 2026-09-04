import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import HomeOpsPanels from '@/app/[locale]/_components/HomeOpsPanels';
import HomeMaintenanceDueSection from '@/app/[locale]/_components/HomeMaintenanceDueSection';
import { InventoryRealtimeProvider } from '@/contexts/InventoryRealtimeContext';
import type { UpcomingMaintenanceTask } from '@/lib/maintenance/types';
import { REAL_SERVICE_RECORD_REFERENCE_DATE } from '@/test/fixtures/service-records.fixture';

vi.mock('@/lib/supabase-session', () => ({
  ensureSupabaseSession: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/hooks/use-home-maintenance-tasks', () => ({
  useHomeMaintenanceTasks: (tasks: UpcomingMaintenanceTask[]) => tasks,
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
    equipment: 'ซิงค์ล้างจานบาร์ชง',
    advice: 'ล้างทำความสะอาดด้วยโซดาไฟ',
    dueDate: '2026-08-26',
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
    expect(screen.getAllByText('ซิงค์ล้างจานบาร์ชง').length).toBeGreaterThanOrEqual(1);
  });

  test('renders purchase and maintenance sections in the page', () => {
    renderOpsPanels();

    expect(
      screen.getAllByRole('heading', { name: 'รายการที่ต้องสั่งซื้อ' }).length,
    ).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole('tab', { name: /ซ่อมบำรุง/ }));

    expect(
      screen.getAllByRole('heading', { name: 'รายการซ่อมบำรุงที่ต้องทำ' }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  test('keeps space between mobile ops tabs and content card', () => {
    renderOpsPanels();

    const tablist = screen.getByRole('tablist', {
      name: 'สลับระหว่างรายการสั่งซื้อและซ่อมบำรุง',
    });
    expect(tablist.className).toMatch(/\bmb-(?:3|3\.5|4|5)\b/);
  });
});

describe('HomeMaintenanceDueSection', () => {
  test('shows empty state when no maintenance tasks are due within one week', () => {
    render(
      <HomeMaintenanceDueSection tasks={[]} locale="th" />,
    );

    expect(
      screen.getByText('ไม่มีรายการซ่อมบำรุงที่ต้องทำ'),
    ).toBeInTheDocument();
  });

  test('shows due date with remaining days and hides urgency column', () => {
    render(
      <HomeMaintenanceDueSection
        tasks={[
          {
            id: 'm1',
            equipment: 'แอร์ 3 ห้องคั่ว',
            advice: 'ล้างทำความสะอาดด้วยช่าง',
            dueDate: '2026-10-26',
            urgency: 'within_90_days',
          },
        ]}
        locale="th"
        currentIsoDate={REAL_SERVICE_RECORD_REFERENCE_DATE}
      />,
    );

    expect(screen.queryByRole('columnheader', { name: 'ความเร่งด่วน' })).not.toBeInTheDocument();
    expect(screen.getAllByText('26/10/2026 (55 วัน)').length).toBeGreaterThanOrEqual(1);
  });
});
