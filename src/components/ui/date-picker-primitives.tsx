'use client';

import type { CSSProperties, ReactNode, Ref } from 'react';
import { motion } from 'framer-motion';
import { calendarPopover, withReducedMotion } from '@/lib/motion-presets';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';

export const DATE_PICKER_TRIGGER_BASE =
  'group relative flex items-center justify-center gap-2 h-11 min-h-[44px] px-4 text-xs font-normal text-foreground bg-card hover:bg-muted/40 rounded-2xl border border-border/80 bb-transition duration-200 active:scale-[0.98] uppercase tracking-[0.08em] bb-shadow-sm w-full min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15';

export const DATE_PICKER_TRIGGER_OPEN = 'ring-2 ring-foreground/10 border-foreground/25 bg-muted/20';

export const DATE_PICKER_ICON_WRAP =
  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/30 text-foreground bb-transition group-hover:bg-muted/45 group-hover:border-border';

export const DATE_PICKER_NAV_BTN =
  'inline-flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-border/80 bg-card text-foreground hover:bg-muted/40 bb-transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15 active:scale-95';

export const DATE_PICKER_POPOVER_SHELL =
  'bg-card rounded-2xl border border-border bb-shadow-xl p-5';

export const DATE_PICKER_MONTH_LABEL =
  'text-[13px] font-normal text-foreground uppercase tracking-[0.12em] select-none';

export const DATE_PICKER_WEEKDAY =
  'text-[10px] font-normal tracking-[0.12em] select-none';

export const DATE_PICKER_DAY_BASE =
  'aspect-square rounded-xl text-[12px] font-normal flex items-center justify-center bb-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20';

type DatePickerPopoverShellProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  popoverRef?: Ref<HTMLDivElement>;
  ariaLabel: string;
  coords: { top: number; left: number; width: number } | null;
};

export function DatePickerPopoverShell({
  children,
  className,
  style,
  popoverRef,
  ariaLabel,
  coords,
}: DatePickerPopoverShellProps) {
  const reduced = usePrefersReducedMotion();
  const popoverMotion = withReducedMotion(calendarPopover, reduced);

  return (
    <motion.div
      ref={popoverRef}
      role="dialog"
      aria-label={ariaLabel}
      aria-modal="true"
      initial={popoverMotion.initial}
      animate={popoverMotion.animate}
      exit={popoverMotion.exit}
      transition={popoverMotion.transition}
      style={
        coords
          ? { position: 'fixed', top: coords.top, left: coords.left, width: coords.width, zIndex: 9999, ...style }
          : style
      }
      className={cn(
        DATE_PICKER_POPOVER_SHELL,
        !coords &&
          'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-xs z-[9999]',
        className,
      )}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </motion.div>
  );
}
