'use client';

import { useEffect, useMemo, useState } from 'react';
import { ShoppingCart, Wrench } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { SegmentTabBar } from '@/components/ui/segment-tab-bar';
import { computePurchaseOrderDerivedState } from '@/lib/inventory-stock';
import {
  useInventoryRealtime,
  type InventoryRealtimeItem,
} from '@/contexts/InventoryRealtimeContext';
import { useHomeMaintenanceTasks } from '@/hooks/use-home-maintenance-tasks';
import type { UpcomingMaintenanceTask } from '@/lib/maintenance/types';
import HomePurchaseOrdersSection from './HomePurchaseOrdersSection';
import HomeMaintenanceDueSection from './HomeMaintenanceDueSection';
import type { HomeSectionLayout } from './home-layout';

type HomeOpsTab = 'purchase' | 'maintenance';

type HomeOpsPanelsProps = {
  initialItems: InventoryRealtimeItem[];
  maintenanceTasks: UpcomingMaintenanceTask[];
  locale: string;
  layout?: HomeSectionLayout;
};

export default function HomeOpsPanels({
  initialItems,
  maintenanceTasks,
  locale,
  layout = 'default',
}: HomeOpsPanelsProps) {
  const isDashboard = layout === 'dashboard';
  const [activeTab, setActiveTab] = useState<HomeOpsTab>('purchase');
  const { items, refresh, hasLoaded } = useInventoryRealtime();
  const liveMaintenanceTasks = useHomeMaintenanceTasks(maintenanceTasks);

  const effectiveItems = hasLoaded ? items : initialItems;

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const { itemsToOrder } = useMemo(
    () => computePurchaseOrderDerivedState(effectiveItems, ['all']),
    [effectiveItems],
  );

  const purchaseCount = itemsToOrder.length;
  const maintenanceCount = liveMaintenanceTasks.length;

  const opsTabs = useMemo(
    () => [
      {
        id: 'purchase' as const,
        label: 'สั่งซื้อ',
        count: purchaseCount,
        icon: (
          <ShoppingCart className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.5} aria-hidden />
        ),
      },
      {
        id: 'maintenance' as const,
        label: 'ซ่อมบำรุง',
        count: maintenanceCount,
        icon: <Wrench className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.5} aria-hidden />,
      },
    ],
    [maintenanceCount, purchaseCount],
  );

  return (
    <div
      className={cn(
        isDashboard && 'md:flex-[9] md:min-h-0 md:flex md:flex-col md:gap-3',
      )}
    >
      <SegmentTabBar
        tabs={opsTabs}
        value={activeTab}
        onChange={setActiveTab}
        ariaLabel="สลับระหว่างรายการสั่งซื้อและซ่อมบำรุง"
        className="md:hidden shrink-0 mb-3"
      />

      <div className="md:hidden">
        <div
          role="tabpanel"
          id={`segment-panel-${activeTab}`}
          aria-labelledby={`segment-tab-${activeTab}`}
        >
          {activeTab === 'purchase' ? (
            <HomePurchaseOrdersSection
              initialItems={initialItems}
              locale={locale}
              layout={layout}
            />
          ) : (
            <HomeMaintenanceDueSection
              tasks={liveMaintenanceTasks}
              locale={locale}
              layout={layout}
            />
          )}
        </div>
      </div>

      <div
        className={cn(
          'hidden md:grid md:gap-4 md:items-stretch',
          isDashboard
            ? 'md:grid-cols-2 md:flex-1 md:min-h-0'
            : 'md:grid-cols-1',
        )}
      >
        <HomePurchaseOrdersSection
          initialItems={initialItems}
          locale={locale}
          layout={layout}
        />
        <HomeMaintenanceDueSection
          tasks={liveMaintenanceTasks}
          locale={locale}
          layout={layout}
        />
      </div>
    </div>
  );
}
