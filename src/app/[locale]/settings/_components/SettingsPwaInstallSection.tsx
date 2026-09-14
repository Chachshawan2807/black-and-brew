'use client';

import { Download } from '@/lib/icons';
import { PwaInstallButton } from '@/components/PwaInstallButton';
import { PWA_DISPLAY_NAME } from '@/lib/pwa-config';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { cn } from '@/lib/utils';
import {
  SETTINGS_SECTION,
  SETTINGS_SECTION_BODY,
  SettingsIconBadge,
} from './settings-ui-primitives';

type SettingsPwaInstallSectionProps = {
  locale: 'th' | 'en';
  isTh: boolean;
};

export function SettingsPwaInstallSection({ locale, isTh }: SettingsPwaInstallSectionProps) {
  const { visible, mode } = usePwaInstall();
  if (!visible || mode === 'hidden') return null;

  return (
    <section className={cn(SETTINGS_SECTION, SETTINGS_SECTION_BODY)}>
      <div className="mb-3 flex items-center gap-2">
        <SettingsIconBadge size="md" tone="muted">
          <Download size={16} strokeWidth={1.75} />
        </SettingsIconBadge>
        <h2 className="text-[14px] font-normal text-foreground leading-snug">
          {isTh ? 'ติดตั้งแอป' : 'Install app'}
        </h2>
      </div>
      <p className="mb-3 text-[13px] font-normal leading-relaxed text-muted-foreground">
        {isTh
          ? `เพิ่ม ${PWA_DISPLAY_NAME} ไปที่หน้าจอโฮมเพื่อเปิดเร็วขึ้นและใช้งานแบบแอป`
          : `Add ${PWA_DISPLAY_NAME} to your home screen for faster access and an app-like experience`}
      </p>
      <PwaInstallButton locale={locale} variant="settings" />
    </section>
  );
}
