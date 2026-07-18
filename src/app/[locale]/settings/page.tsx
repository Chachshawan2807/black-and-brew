import { Settings2 } from 'lucide-react';
import { SettingsPageSections } from './_components/SettingsPageSections';

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
          <div>
            <h1 className="text-lg md:text-xl font-normal text-foreground leading-snug">
              {isTh ? 'ตั้งค่า' : 'Settings'}
            </h1>
            <p className="text-[13px] text-muted-foreground/90 font-normal mt-0.5 leading-normal">
              {isTh ? 'การแจ้งเตือน ประวัติ และความปลอดภัย' : 'Notifications, history & security'}
            </p>
          </div>
        </div>
      </header>

      <SettingsPageSections locale={locale} isTh={isTh} />
    </div>
  );
}
