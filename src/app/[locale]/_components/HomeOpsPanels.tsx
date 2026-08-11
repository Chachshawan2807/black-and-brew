'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
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

  const tabButtonClass = (tab: HomeOpsTab) =>
    cn(
      'flex-1 px-3.5 py-2 text-[13px] rounded-full border transition-all duration-200 font-normal whitespace-nowrap',
      activeTab === tab
        ? 'bg-foreground border-foreground text-background bb-shadow-sm'
        : 'border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50',
    );

  return (
    <div
      className={cn(
        isDashboard && 'md:flex-[9] md:min-h-0 md:flex md:flex-col md:gap-3',
      )}
    >
      <div
        role="tablist"
        aria-label="สลับระหว่างรายการสั่งซื้อและซ่อมบำรุง"
        className="md:hidden flex gap-2 shrink-0 mb-3"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'purchase'}
          onClick={() => setActiveTab('purchase')}
          className={tabButtonClass('purchase')}
        >
          สั่งซื้อ
          <span className="ml-1 text-[11px] tabular-nums opacity-70">({purchaseCount})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'maintenance'}
          onClick={() => setActiveTab('maintenance')}
          className={tabButtonClass('maintenance')}
        >
          ซ่อมบำรุง
          <span className="ml-1 text-[11px] tabular-nums opacity-70">({maintenanceCount})</span>
        </button>
      </div>

      <div className="md:hidden">
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
