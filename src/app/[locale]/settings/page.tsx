import { Settings2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { createLazyFeatureClient } from '@/lib/lazy-feature-client';

const SettingsPageSections = createLazyFeatureClient(
  () => import('./_components/SettingsPageSections'),
);

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isTh = locale === 'th';

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto w-full text-[14px] leading-relaxed">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted bb-shadow-sm">
            <Settings2 size={18} strokeWidth={1.75} className="text-foreground/70" />
          </div>
          <PageHeader
            title={isTh ? 'ตั้งค่า' : 'Settings'}
            subtitle={
              isTh
                ? 'การแจ้งเตือน ประวัติ และความปลอดภัย'
                : 'Notifications, history & security'
            }
            size="compact"
            titleClassName="leading-snug"
          />
        </div>
      </header>

      <SettingsPageSections locale={locale} isTh={isTh} />
    </div>
  );
}
