'use client';

import { Bell } from 'lucide-react';
import NotificationPreferencesSection from './NotificationPreferencesSection';
import SettingsLazyCollapsibleSection from './SettingsLazyCollapsibleSection';

interface SettingsPageSectionsProps {
  locale: string;
  isTh: boolean;
}

export function SettingsPageSections({ locale, isTh }: SettingsPageSectionsProps) {
  const loadingLabel = isTh ? 'กำลังโหลด...' : 'Loading…';

  return (
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

      <SettingsLazyCollapsibleSection
        icon="history"
        title={isTh ? 'ประวัติการแก้ไข' : 'Edit history'}
        description={isTh ? 'ดูว่าใครแก้ข้อมูลอะไร และเมื่อไหร่' : 'See who changed what, and when'}
        locale={locale}
        loadingLabel={loadingLabel}
        load={() => import('./DataChangeHistorySection')}
      />

      <SettingsLazyCollapsibleSection
        icon="shield"
        title={isTh ? 'ประวัติการเข้าสู่ระบบ' : 'Sign-in history'}
        description={isTh ? 'ดูการเข้า–ออก และอุปกรณ์ที่ยังล็อกอินอยู่' : 'Review sign-ins and devices still logged in'}
        locale={locale}
        loadingLabel={loadingLabel}
        load={() => import('./LoginHistorySection')}
      />

      <SettingsLazyCollapsibleSection
        icon="fingerprint"
        title={isTh ? 'เข้าด้วยลายนิ้วมือ / ใบหน้า' : 'Biometric login'}
        description={isTh ? 'เข้าสู่ระบบเร็วขึ้นโดยไม่ต้องพิมพ์ PIN' : 'Sign in faster without typing a PIN'}
        locale={locale}
        loadingLabel={loadingLabel}
        load={() => import('./PasskeyDeviceSection')}
      />
    </div>
  );
}
