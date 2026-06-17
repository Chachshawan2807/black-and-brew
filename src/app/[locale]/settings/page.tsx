import { Settings2, Bell } from 'lucide-react';
import LoginHistorySection from '@/components/settings/LoginHistorySection';
import PasskeyDeviceSection from '@/components/settings/PasskeyDeviceSection';
import DataChangeHistorySection from '@/components/settings/DataChangeHistorySection';
import NotificationPreferencesSection from '@/components/settings/NotificationPreferencesSection';
import SettingsCollapsibleSection from '@/components/settings/SettingsCollapsibleSection';

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isTh = locale === 'th';

  return (
    <div className="animate-page-enter p-4 md:p-8 max-w-3xl mx-auto w-full text-[14px] leading-relaxed">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted">
            <Settings2 size={18} strokeWidth={1.75} className="text-foreground/70" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-normal text-foreground leading-snug">
              {isTh ? 'ตั้งค่า' : 'Settings'}
            </h1>
            <p className="text-[13px] text-muted-foreground/90 font-normal mt-0.5 leading-normal">
              {isTh ? 'ประวัติการแก้ไข การแจ้งเตือน และความปลอดภัย' : 'Edit history, notifications & security'}
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-3">
        <section className="bb-card p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1">
            <Bell size={14} strokeWidth={1.75} className="text-muted-foreground" />
            <h2 className="text-[13px] font-normal text-muted-foreground">
              {isTh ? 'การแจ้งเตือน' : 'Notifications'}
            </h2>
          </div>
          <NotificationPreferencesSection locale={locale} />
        </section>

        <SettingsCollapsibleSection
          icon="history"
          title={isTh ? 'ประวัติการแก้ไขข้อมูล' : 'Data change history'}
        >
          <DataChangeHistorySection locale={locale} />
        </SettingsCollapsibleSection>

        <SettingsCollapsibleSection
          icon="shield"
          title={isTh ? 'ประวัติการเข้าสู่ระบบ' : 'Login history'}
        >
          <LoginHistorySection locale={locale} />
        </SettingsCollapsibleSection>

        <SettingsCollapsibleSection
          icon="shield"
          title={isTh ? 'เข้าด้วยลายนิ้วมือ / ใบหน้า' : 'Biometric login'}
        >
          <PasskeyDeviceSection locale={locale} />
        </SettingsCollapsibleSection>
      </div>
    </div>
  );
}
