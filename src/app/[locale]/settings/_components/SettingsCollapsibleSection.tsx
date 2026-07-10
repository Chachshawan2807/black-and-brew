'use client';

import { useId, useState, type ReactNode } from 'react';
import { ChevronDown, Fingerprint, History, Shield, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

export default function SettingsCollapsibleSection({
  icon,
  title,
  description,
  children,
  defaultOpen = false,
}: SettingsCollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [hasOpened, setHasOpened] = useState(defaultOpen);
  const panelId = useId();
  const Icon: LucideIcon = ICONS[icon];

  return (
    <section className="bb-card overflow-hidden">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next) setHasOpened(true);
            return next;
          });
        }}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          'flex w-full items-center gap-3 p-4 md:p-5 text-left bb-transition',
          'hover:bg-muted/30',
          open && 'border-b border-border'
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted bb-shadow-sm">
          <Icon size={18} strokeWidth={1.75} className="text-foreground/70" />
        </div>
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
