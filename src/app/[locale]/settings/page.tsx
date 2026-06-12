'use client';

import { useParams } from 'next/navigation';
import { Settings2, Palette, Shield, History, Bell } from 'lucide-react';
import ThemePicker from '@/components/settings/ThemePicker';
import LoginHistorySection from '@/components/settings/LoginHistorySection';
import DataChangeHistorySection from '@/components/settings/DataChangeHistorySection';
import NotificationPreferencesSection from '@/components/settings/NotificationPreferencesSection';

export default function SettingsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'th';
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
              {isTh ? 'ธีม ประวัติการแก้ไข และความปลอดภัย' : 'Theme, edit history & security'}
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-5">
        <section className="bb-card p-4 md:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Palette size={14} strokeWidth={1.75} className="text-muted-foreground" />
            <h2 className="text-[13px] font-normal text-muted-foreground">
              {isTh ? 'ธีม' : 'Theme'}
            </h2>
          </div>
          <ThemePicker locale={locale} />
        </section>

        <section className="bb-card p-4 md:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={14} strokeWidth={1.75} className="text-muted-foreground" />
            <h2 className="text-[13px] font-normal text-muted-foreground">
              {isTh ? 'การแจ้งเตือน' : 'Notifications'}
            </h2>
          </div>
          <NotificationPreferencesSection locale={locale} />
        </section>

        <section className="bb-card p-4 md:p-5">
          <div className="flex items-center gap-2 mb-3">
            <History size={14} strokeWidth={1.75} className="text-muted-foreground" />
            <h2 className="text-[13px] font-normal text-muted-foreground">
              {isTh ? 'ประวัติการแก้ไขข้อมูล' : 'Data change history'}
            </h2>
          </div>
          <DataChangeHistorySection locale={locale} />
        </section>

        <section className="bb-card p-4 md:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} strokeWidth={1.75} className="text-muted-foreground" />
            <h2 className="text-[13px] font-normal text-muted-foreground">
              {isTh ? 'ประวัติการเข้าสู่ระบบ' : 'Login history'}
            </h2>
          </div>
          <LoginHistorySection locale={locale} />
        </section>
      </div>
    </div>
  );
}
