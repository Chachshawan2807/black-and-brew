'use client';

import { useEffect, useState } from 'react';
import { Bell } from '@/lib/icons';
import { cn } from '@/lib/utils';
import {
  detectBiometricKind,
  getBiometricLabels,
  resolveBiometricKind,
  type BiometricKind,
} from '@/lib/passkey/biometric-copy';
import { preloadSettingsSectionsOnIdle } from '@/lib/settings-chunk-preload';
import NotificationPreferencesSection from './NotificationPreferencesSection';
import SettingsLazyCollapsibleSection from './SettingsLazyCollapsibleSection';
import { SETTINGS_SECTION, SETTINGS_SECTION_BODY } from './settings-ui-primitives';

interface SettingsPageSectionsProps {
  locale: string;
  isTh: boolean;
}

export default function SettingsPageSections({ locale, isTh }: SettingsPageSectionsProps) {
  const loadingLabel = isTh ? 'กำลังโหลด...' : 'Loading…';
  const biometricLocale = isTh ? 'th' : 'en';
  const [biometricKind, setBiometricKind] = useState<BiometricKind>(() =>
    detectBiometricKind()
  );
  const biometricLabels = getBiometricLabels(biometricLocale, biometricKind);

  useEffect(() => {
    let cancelled = false;
    void resolveBiometricKind().then((kind) => {
      if (!cancelled) setBiometricKind(kind);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    preloadSettingsSectionsOnIdle();
  }, []);

  return (
    <div className="space-y-3">
      <section className={cn(SETTINGS_SECTION, SETTINGS_SECTION_BODY)}>
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
        title={biometricLabels.settingsTitle}
        description={isTh ? 'เข้าสู่ระบบเร็วขึ้นโดยไม่ต้องพิมพ์ PIN' : 'Sign in faster without typing a PIN'}
        locale={locale}
        loadingLabel={loadingLabel}
        load={() => import('./PasskeyDeviceSection')}
      />
    </div>
  );
}
