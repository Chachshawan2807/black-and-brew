'use client';

import { useRef, useState, type ComponentType } from 'react';
import SettingsCollapsibleSection from './SettingsCollapsibleSection';
import { SETTINGS_BTN_GHOST } from './settings-ui-primitives';

interface SettingsLazyCollapsibleSectionProps {
  icon: 'history' | 'shield' | 'fingerprint';
  title: string;
  description?: string;
  locale: string;
  load: () => Promise<{ default: ComponentType<{ locale: string }> }>;
  loadingLabel: string;
}

function SectionSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="h-14 rounded-2xl bg-muted/40 animate-pulse" />
      ))}
    </div>
  );
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const chunkWarmRef = useRef(false);
  const loadGenRef = useRef(0);

  const warmChunk = () => {
    if (chunkWarmRef.current || Section) return;
    chunkWarmRef.current = true;
    void load().catch(() => {
      chunkWarmRef.current = false;
    });
  };

  const mountSection = () => {
    if (Section || loading) return;
    const gen = ++loadGenRef.current;
    setLoading(true);
    setLoadError(null);
    void load()
      .then((module) => {
        if (gen !== loadGenRef.current) return;
        setSection(() => module.default);
      })
      .catch(() => {
        if (gen !== loadGenRef.current) return;
        setLoadError('load_failed');
        chunkWarmRef.current = false;
      })
      .finally(() => {
        if (gen === loadGenRef.current) {
          setLoading(false);
        }
      });
  };

  return (
    <SettingsCollapsibleSection
      icon={icon}
      title={title}
      description={description}
      onFirstOpen={mountSection}
      onIntentPrefetch={warmChunk}
    >
      {Section ? (
        <Section locale={locale} />
      ) : loading ? (
        <SectionSkeleton />
      ) : loadError ? (
        <div className="py-2 space-y-2">
          <p className="text-[13px] text-red-500">
            {locale === 'th' ? 'โหลดส่วนนี้ไม่ได้' : 'Could not load this section'}
          </p>
          <button
            type="button"
            onClick={mountSection}
            className={SETTINGS_BTN_GHOST}
          >
            {locale === 'th' ? 'ลองใหม่' : 'Try again'}
          </button>
        </div>
      ) : (
        <p className="py-2 text-[13px] text-muted-foreground">{loadingLabel}</p>
      )}
    </SettingsCollapsibleSection>
  );
}
