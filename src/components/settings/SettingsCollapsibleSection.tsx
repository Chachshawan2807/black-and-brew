'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, History, Shield, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS = {
  history: History,
  shield: Shield,
} as const;

interface SettingsCollapsibleSectionProps {
  icon: keyof typeof ICONS;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export default function SettingsCollapsibleSection({
  icon,
  title,
  children,
  defaultOpen = false,
}: SettingsCollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon: LucideIcon = ICONS[icon];

  return (
    <section className="bb-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-3 p-4 md:p-5 text-left bb-transition',
          'hover:bg-muted/30',
          open && 'border-b border-border'
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted">
          <Icon size={18} strokeWidth={1.75} className="text-foreground/70" />
        </div>
        <span className="flex-1 text-[14px] text-foreground leading-snug">{title}</span>
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          className={cn(
            'shrink-0 text-muted-foreground bb-transition',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <div className="px-4 pt-3 pb-4 md:px-5 md:pt-4 md:pb-5">
          {children}
        </div>
      )}
    </section>
  );
}
