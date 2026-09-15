'use client';

import { PwaInstallButton } from '@/components/PwaInstallButton';

type SettingsPwaInstallSectionProps = {
  locale: 'th' | 'en';
};

export function SettingsPwaInstallSection({ locale }: SettingsPwaInstallSectionProps) {
  return <PwaInstallButton locale={locale} variant="settings" />;
}
