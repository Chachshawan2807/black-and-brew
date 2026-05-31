import { getTranslations } from 'next-intl/server';
import CommandCenterGrid from '@/components/CommandCenterGrid';
import { WeatherWidget } from '@/components/dashboard/WeatherWidget';

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
    },
    {
      id: 'marketInsights',
      title: t('marketInsightsTitle'),
      description: t('marketInsightsDescription'),
      href: `/${locale}/market-insights`,
      iconName: 'LineChart',
    }
  ];

  return (
    <div className="min-h-[calc(100vh-2rem)] bg-inherit flex flex-col items-center justify-center relative px-4 py-8">
      <div className="max-w-4xl w-full space-y-12">
        <WeatherWidget />

        <CommandCenterGrid initialItems={navItems} />
      </div>
    </div>
  );
}
