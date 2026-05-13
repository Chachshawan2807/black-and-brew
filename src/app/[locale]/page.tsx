import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import CommandCenterGrid from '@/components/CommandCenterGrid';

export default async function IndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('Dashboard');

  const navItems = [
    {
      id: 'staffDashboard',
      title: t('staffTitle'),
      description: t('staff'),
      href: `/${locale}/dashboard`,
      iconName: 'LayoutGrid',
    },
    {
      id: 'schedule',
      title: t('scheduleTitle'),
      description: t('schedule'),
      href: `/${locale}/schedule`,
      iconName: 'CalendarRange',
    },
    {
      id: 'maintenance',
      title: t('maintenanceTitle'),
      description: t('maintenance'),
      href: `/${locale}/maintenance`,
      iconName: 'Wrench',
    },
    {
      id: 'inventory',
      title: t('inventoryTitle'),
      description: t('inventory'),
      href: `/${locale}/inventory`,
      iconName: 'Package',
    }
  ];

  return (
    <div className="min-h-[calc(100vh-2rem)] bg-inherit flex flex-col items-center justify-center relative px-4 py-8">
      <div className="max-w-4xl w-full space-y-12">
        <header className="flex flex-col items-center justify-center gap-6 relative z-[50]">
          {/* Logo removed - only present in Sidebar */}
        </header>

        <CommandCenterGrid initialItems={navItems} />
      </div>
    </div>
  );
}
