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
import { SETTINGS_SECTION, SETTINGS_SECTION_BODY, SettingsIconBadge } from './settings-ui-primitives';
import { SettingsPwaInstallSection } from './SettingsPwaInstallSection';

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
        <div className="mb-3 flex items-center gap-2">
          <SettingsIconBadge size="md" tone="muted">
            <Bell size={16} strokeWidth={1.75} />
          </SettingsIconBadge>
          <h2 className="text-[14px] font-normal text-foreground leading-snug">
            {isTh ? 'การแจ้งเตือน' : 'Notifications'}
          </h2>
        </div>
        <NotificationPreferencesSection locale={locale} />
      </section>

      <SettingsLazyCollapsibleSection
        sectionKey="dataHistory"
        icon="history"
        title={isTh ? 'ประวัติการแก้ไข' : 'Edit history'}
        locale={locale}
        loadingLabel={loadingLabel}
        load={() => import('./DataChangeHistorySection')}
      />

      <SettingsLazyCollapsibleSection
        sectionKey="loginHistory"
        icon="shield"
        title={isTh ? 'ประวัติการเข้าสู่ระบบ' : 'Sign-in history'}
        locale={locale}
        loadingLabel={loadingLabel}
        load={() => import('./LoginHistorySection')}
      />

      <SettingsLazyCollapsibleSection
        sectionKey="passkey"
        icon="fingerprint"
        title={biometricLabels.settingsTitle}
        locale={locale}
        loadingLabel={loadingLabel}
        load={() => import('./PasskeyDeviceSection')}
      />

      <SettingsPwaInstallSection locale={isTh ? 'th' : 'en'} />
    </div>
  );
}
