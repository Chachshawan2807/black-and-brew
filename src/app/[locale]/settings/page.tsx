import { Settings2, Bell } from 'lucide-react';
import LoginHistorySection from './_components/LoginHistorySection';
import PasskeyDeviceSection from './_components/PasskeyDeviceSection';
import DataChangeHistorySection from './_components/DataChangeHistorySection';
import NotificationPreferencesSection from './_components/NotificationPreferencesSection';
import SettingsCollapsibleSection from './_components/SettingsCollapsibleSection';

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

      <div className="space-y-3">
        <section className="bb-card p-4 md:p-5">
          <div className="mb-1">
            <div className="flex items-center gap-2">
              <Bell size={14} strokeWidth={1.75} className="text-muted-foreground" />
              <h2 className="text-[13px] font-normal text-muted-foreground">
                {isTh ? 'การแจ้งเตือน' : 'Notifications'}
              </h2>
            </div>
            <p className="text-[12px] text-muted-foreground mt-1 leading-normal">
              {isTh
                ? 'เปิดหรือปิดการแจ้งเตือนทั้งหมด แล้วปรับรายละเอียดได้เมื่อเปิดใช้งาน'
                : 'Turn all alerts on or off, then fine-tune when enabled'}
            </p>
          </div>
          <NotificationPreferencesSection locale={locale} />
        </section>

        <SettingsCollapsibleSection
          icon="history"
          title={isTh ? 'ประวัติการแก้ไข' : 'Edit history'}
          description={isTh ? 'ดูว่าใครแก้ข้อมูลอะไร และเมื่อไหร่' : 'See who changed what, and when'}
        >
          <DataChangeHistorySection locale={locale} />
        </SettingsCollapsibleSection>

        <SettingsCollapsibleSection
          icon="shield"
          title={isTh ? 'ประวัติการเข้าสู่ระบบ' : 'Sign-in history'}
          description={isTh ? 'ดูการเข้า–ออก และอุปกรณ์ที่ยังล็อกอินอยู่' : 'Review sign-ins and devices still logged in'}
        >
          <LoginHistorySection locale={locale} />
        </SettingsCollapsibleSection>

        <SettingsCollapsibleSection
          icon="fingerprint"
          title={isTh ? 'เข้าด้วยลายนิ้วมือ / ใบหน้า' : 'Biometric login'}
          description={isTh ? 'เข้าสู่ระบบเร็วขึ้นโดยไม่ต้องพิมพ์ PIN' : 'Sign in faster without typing a PIN'}
        >
          <PasskeyDeviceSection locale={locale} />
        </SettingsCollapsibleSection>
      </div>
    </div>
  );
}
