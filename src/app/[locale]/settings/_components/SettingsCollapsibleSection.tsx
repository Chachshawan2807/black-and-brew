'use client';

import { useId, useState, type ReactNode } from 'react';
import { ChevronDown, Fingerprint, History, Shield, type LucideIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { SETTINGS_SECTION, SettingsIconBadge } from './settings-ui-primitives';

const ICONS = {
  history: History,
  shield: Shield,
  fingerprint: Fingerprint,
} as const;

interface SettingsCollapsibleSectionProps {
  icon: keyof typeof ICONS;
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  onFirstOpen?: () => void;
  onIntentPrefetch?: () => void;
}

export default function SettingsCollapsibleSection({
  icon,
  title,
  description,
  children,
  defaultOpen = false,
  onFirstOpen,
  onIntentPrefetch,
}: SettingsCollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [hasOpened, setHasOpened] = useState(defaultOpen);
  const panelId = useId();
  const Icon: LucideIcon = ICONS[icon];

  return (
    <section className={SETTINGS_SECTION}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next) {
              setHasOpened(true);
              onFirstOpen?.();
            }
            return next;
          });
        }}
        onPointerEnter={() => {
          if (!hasOpened) onIntentPrefetch?.();
        }}
        onFocus={() => {
          if (!hasOpened) onIntentPrefetch?.();
        }}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          'flex w-full items-center gap-3 p-4 md:p-5 text-left bb-transition',
          'hover:bg-muted/30',
          open && 'border-b border-border'
        )}
      >
        <SettingsIconBadge className="shrink-0">
          <Icon size={18} strokeWidth={1.75} />
        </SettingsIconBadge>
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] text-foreground leading-snug">{title}</span>
          {description ? (
            <span className="block text-[12px] text-muted-foreground mt-0.5 leading-normal">
              {description}
            </span>
          ) : null}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          className={cn(
            'shrink-0 text-muted-foreground bb-transition',
            open && 'rotate-180'
          )}
        />
      </button>
      {hasOpened ? (
        <div
          id={panelId}
          hidden={!open}
          className="px-4 pt-3 pb-4 md:px-5 md:pt-4 md:pb-5"
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
