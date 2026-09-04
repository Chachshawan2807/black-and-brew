'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CloseIcon } from '@/components/ui/close-icon';
import { HintTooltip } from '@/components/ui/hint-tooltip';

/** Toolbar action pill (44px touch target, token surfaces). */
export const SCHEDULE_TOOLBAR_BUTTON =
  'inline-flex items-center justify-center gap-1.5 h-11 min-h-[44px] px-4 text-xs font-normal text-foreground bg-card hover:bg-muted/40 rounded-2xl border border-border/80 bb-transition duration-200 active:scale-[0.98] uppercase tracking-[0.08em] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap';

export const SCHEDULE_TOOLBAR_HISTORY_BUTTON =
  'inline-flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-border/80 bg-card bb-transition duration-200 active:scale-[0.98]';

export const SCHEDULE_MODAL_OVERLAY = 'bg-black/25 backdrop-blur-sm';

export const SCHEDULE_MODAL_PANEL =
  'relative rounded-t-[28px] md:rounded-3xl w-full overflow-hidden bg-card shadow-2xl border border-border text-foreground flex flex-col';

export const SCHEDULE_MODAL_PANEL_SHEET =
  'fixed bottom-0 left-0 right-0 rounded-t-[28px] w-full max-h-[85vh] overflow-y-auto bb-smooth-scroll bg-card shadow-2xl md:relative md:rounded-3xl md:max-w-sm md:max-h-none md:translate-y-0 border border-border';

export const SCHEDULE_FORM_LABEL =
  'text-[11px] font-normal text-muted-foreground uppercase tracking-[0.12em] px-0.5 block';

export const SCHEDULE_FIELD_INPUT =
  'w-full h-11 bg-background border border-border rounded-2xl px-4 text-base md:text-[14px] text-foreground placeholder:text-muted-foreground outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/10 focus:border-foreground/30 bb-transition';

export const SCHEDULE_TEXTAREA =
  'w-full min-h-[5rem] p-4 rounded-2xl border border-border bg-background outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/10 focus:border-foreground/30 bb-transition resize-none text-base md:text-[13px] leading-relaxed font-normal text-foreground placeholder:text-muted-foreground';

export const SCHEDULE_BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 h-11 min-h-[44px] px-4 text-[13px] font-normal bg-foreground text-background rounded-2xl hover:opacity-90 bb-transition shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

export const SCHEDULE_BTN_SECONDARY =
  'inline-flex items-center justify-center gap-2 h-11 min-h-[44px] px-4 text-[13px] font-normal text-foreground bg-card hover:bg-muted/30 rounded-2xl border border-border bb-transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

export const SCHEDULE_BTN_GHOST =
  'inline-flex items-center justify-center gap-2 h-11 min-h-[44px] px-4 text-[13px] font-normal text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-2xl bb-transition cursor-pointer';

export const SCHEDULE_MODAL_HEADER =
  'min-h-[72px] px-5 py-4 border-b border-border flex items-center bg-card shrink-0';

export const SCHEDULE_MODAL_FOOTER =
  'p-4 bg-card border-t border-border flex gap-3 shrink-0 max-md:pb-[calc(1rem+env(safe-area-inset-bottom))]';

export const SCHEDULE_DAY_TOGGLE =
  'h-11 min-h-[44px] rounded-2xl text-[13px] font-normal bb-transition cursor-pointer border';

export const SCHEDULE_DAY_TOGGLE_SELECTED =
  'bg-foreground text-background border-foreground shadow-sm';

export const SCHEDULE_DAY_TOGGLE_IDLE =
  'bg-card border-border text-foreground hover:bg-muted/30';

type ScheduleModalCloseButtonProps = {
  onClose: () => void;
  disabled?: boolean;
  label?: string;
  className?: string;
};

export function ScheduleModalCloseButton({
  onClose,
  disabled = false,
  label = 'ปิด',
  className,
}: ScheduleModalCloseButtonProps) {
  return (
    <HintTooltip tip={label}>
      <button
        type="button"
        onClick={onClose}
        disabled={disabled}
        className={cn(
          'absolute top-4 right-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/30 bb-transition disabled:opacity-50',
          className,
        )}
        aria-label={label}
      >
        <CloseIcon />
      </button>
    </HintTooltip>
  );
}

type ScheduleModalHeaderProps = {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onClose?: () => void;
  closeDisabled?: boolean;
  closeLabel?: string;
  className?: string;
};

export function ScheduleModalHeader({
  icon,
  title,
  subtitle,
  onClose,
  closeDisabled,
  closeLabel,
  className,
}: ScheduleModalHeaderProps) {
  return (
    <div className={cn('relative shrink-0 px-5 pt-5 pb-4', className)}>
      {onClose ? (
        <ScheduleModalCloseButton
          onClose={onClose}
          disabled={closeDisabled}
          label={closeLabel}
        />
      ) : null}
      <ScheduleMobileSheetHandle />
      <div className="flex items-start gap-3 pr-10">
        <div
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/30 text-foreground"
          aria-hidden
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-normal text-foreground tracking-tight">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground text-balance">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type ScheduleModalSectionHeaderProps = {
  icon: ReactNode;
  title: string;
  className?: string;
};

export function ScheduleModalSectionHeader({
  icon,
  title,
  className,
}: ScheduleModalSectionHeaderProps) {
  return (
    <div className={cn(SCHEDULE_MODAL_HEADER, className)}>
      <div className="flex items-center gap-2.5">
        <div
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/25 text-foreground"
          aria-hidden
        >
          {icon}
        </div>
        <h3 className="text-base font-normal text-foreground tracking-tight">{title}</h3>
      </div>
    </div>
  );
}

export function ScheduleMobileSheetHandle() {
  return (
    <div
      className="mx-auto mb-4 h-1 w-10 rounded-full bg-foreground/10 md:hidden"
      aria-hidden
    />
  );
}

type ScheduleEmptyStateProps = {
  icon: ReactNode;
  message: string;
  className?: string;
};

export function ScheduleEmptyState({ icon, message, className }: ScheduleEmptyStateProps) {
  return (
    <div
      className={cn(
        'min-h-[12rem] flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/80 bg-muted/10 px-4 text-center',
        className,
      )}
    >
      <div className="text-muted-foreground/35" aria-hidden>
        {icon}
      </div>
      <p className="text-sm font-normal uppercase tracking-[0.12em] text-muted-foreground/60">
        {message}
      </p>
    </div>
  );
}

type ScheduleSuccessBannerProps = {
  message: string;
  className?: string;
};

export function ScheduleSuccessBanner({ message, className }: ScheduleSuccessBannerProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-2.5 animate-in fade-in slide-in-from-top-1 duration-300',
        className,
      )}
      role="status"
    >
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500">
        <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
      </span>
      <p className="text-[13px] font-normal text-emerald-800">{message}</p>
    </div>
  );
}

type ScheduleIconBadgeProps = {
  children: ReactNode;
  tone?: 'neutral' | 'accent';
  className?: string;
};

export function ScheduleIconBadge({
  children,
  tone = 'neutral',
  className,
}: ScheduleIconBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border',
        tone === 'accent'
          ? 'border-emerald-500/20 bg-emerald-50/60 text-emerald-700'
          : 'border-border/70 bg-muted/25 text-foreground',
        className,
      )}
      aria-hidden
    >
      {children}
    </div>
  );
}
