import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type HomeSectionHeaderProps = {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  /** Trailing meta label (e.g. staff count) */
  meta?: ReactNode;
  actions?: ReactNode;
  compact?: boolean;
  className?: string;
};

export function HomeSectionHeader({
  icon,
  title,
  subtitle,
  meta,
  actions,
  compact = false,
  className,
}: HomeSectionHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between shrink-0',
        compact ? 'mb-3 md:mb-2.5' : 'mb-5',
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/40 bb-shadow-sm',
            compact ? 'h-9 w-9' : 'h-10 w-10',
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2
              className={cn(
                'font-normal text-foreground tracking-tight leading-snug',
                compact
                  ? 'text-[1.05rem]'
                  : 'text-[clamp(1rem,2.5vw,1.25rem)]',
              )}
            >
              {title}
            </h2>
            {meta ? (
              <span className="text-[0.6875rem] font-normal text-muted-foreground/80 uppercase tracking-[0.14em] shrink-0 tabular-nums">
                {meta}
              </span>
            ) : null}
          </div>
          {subtitle ? (
            <p
              className={cn(
                'font-normal text-muted-foreground/90 tracking-wide line-clamp-2',
                compact ? 'mt-0.5 text-[0.8rem]' : 'mt-1 text-[0.8rem]',
              )}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

type HomeSectionBadgeProps = {
  children: ReactNode;
  tone?: 'neutral' | 'alert' | 'warning';
  icon?: ReactNode;
  className?: string;
};

const BADGE_TONE_CLASS = {
  neutral: 'border-border bg-muted/50 text-muted-foreground',
  alert:
    'border-red-200/80 bg-red-50/70 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300',
  warning:
    'border-amber-200/80 bg-amber-50/70 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200',
} as const;

export function HomeSectionBadge({
  children,
  tone = 'neutral',
  icon,
  className,
}: HomeSectionBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] tabular-nums font-normal',
        BADGE_TONE_CLASS[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function homeSectionLinkClassName(className?: string) {
  return cn(
    'inline-flex items-center gap-1 min-h-9 rounded-2xl border border-border bg-background px-3 py-1.5 text-[12px] text-foreground bb-transition touch-manipulation hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    className,
  );
}
