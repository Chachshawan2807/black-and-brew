'use client';

import { cn } from '@/lib/utils';
import { useSidebarToggle, useSidebarHydrated } from '@/hooks/use-sidebar-toggle';
import { useMaxMd } from '@/hooks/use-max-md';
import LiveStatusTracker from './LiveStatusTracker';
import HomeOpsPanels from './HomeOpsPanels';
import type { InventoryRealtimeItem } from '@/contexts/InventoryRealtimeContext';
import type { UpcomingMaintenanceTask } from '@/lib/maintenance/types';

import type { HomeSectionLayout } from './home-layout';

interface Profile {
  id: string;
  full_name: string;
  schedule_order: number;
}

interface Shift {
  employee_id: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'on_leave' | 'day_off';
  metadata?: { location?: string };
}

interface HomePageClientProps {
  locale: string;
  profiles: Profile[];
  shifts: Shift[];
  tomorrowShifts: Shift[];
  currentThaiDate: string;
  tomorrowThaiDate: string;
  inventoryItems: InventoryRealtimeItem[];
  maintenanceTasks: UpcomingMaintenanceTask[];
}

export default function HomePageClient({
  locale,
  profiles,
  shifts,
  tomorrowShifts,
  currentThaiDate,
  tomorrowThaiDate,
  inventoryItems,
  maintenanceTasks,
}: HomePageClientProps) {
  const hydrated = useSidebarHydrated();
  const sidebarOpen = useSidebarToggle((state) => state.isOpen);
  const isMaxMd = useMaxMd();

  const dashboardLayout =
    isMaxMd === false && hydrated && sidebarOpen === false;
  const sectionLayout: HomeSectionLayout = dashboardLayout ? 'dashboard' : 'default';

  return (
    <div
      className={cn(
        'min-h-[calc(100vh-2rem)] bg-inherit flex flex-col justify-start md:justify-center px-[clamp(1rem,5vw,2rem)] py-[clamp(1.5rem,5vw,2.5rem)]',
        dashboardLayout &&
          'md:justify-start md:py-4 md:h-[100svh] md:min-h-0 md:max-h-[100svh] md:overflow-hidden',
      )}
    >
      <div
        className={cn(
          'mx-auto w-full space-y-6 md:space-y-8',
          dashboardLayout
            ? 'md:max-w-[min(96rem,calc(100vw-6rem))] md:h-full md:min-h-0 md:flex md:flex-col md:gap-3 md:space-y-0'
            : 'max-w-3xl',
        )}
      >
        <LiveStatusTracker
          initialProfiles={profiles}
          initialShifts={shifts}
          currentThaiDate={currentThaiDate}
          initialTomorrowShifts={tomorrowShifts}
          tomorrowThaiDate={tomorrowThaiDate}
          layout={sectionLayout}
        />
        <HomeOpsPanels
          initialItems={inventoryItems}
          maintenanceTasks={maintenanceTasks}
          locale={locale}
          layout={sectionLayout}
        />
      </div>
    </div>
  );
}
