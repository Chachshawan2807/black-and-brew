'use client';

import { useState, type ComponentType } from 'react';
import SettingsCollapsibleSection from './SettingsCollapsibleSection';

interface SettingsLazyCollapsibleSectionProps {
  icon: 'history' | 'shield' | 'fingerprint';
  title: string;
  description?: string;
  locale: string;
  load: () => Promise<{ default: ComponentType<{ locale: string }> }>;
  loadingLabel: string;
}

export default function SettingsLazyCollapsibleSection({
  icon,
  title,
  description,
  locale,
  load,
  loadingLabel,
}: SettingsLazyCollapsibleSectionProps) {
  const [Section, setSection] = useState<ComponentType<{ locale: string }> | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFirstOpen = () => {
    if (Section || loading) return;
    setLoading(true);
    void load()
      .then((module) => {
        setSection(() => module.default);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <SettingsCollapsibleSection
      icon={icon}
      title={title}
      description={description}
      onFirstOpen={handleFirstOpen}
    >
      {Section ? (
        <Section locale={locale} />
      ) : loading ? (
        <p className="py-2 text-[13px] text-muted-foreground">{loadingLabel}</p>
      ) : null}
    </SettingsCollapsibleSection>
  );
}
