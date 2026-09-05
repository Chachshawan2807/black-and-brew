import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function homePanelSectionClassName(isDashboard: boolean, className?: string) {
  return cn(
    'rounded-2xl border border-border bg-card bb-shadow-sm',
    isDashboard
      ? 'md:flex-1 md:min-h-0 md:flex md:flex-col p-5 md:p-5 h-full'
      : 'p-5 md:p-7',
    className,
  );
}

type HomePanelEmptyStateProps = {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  dashboard?: boolean;
  compact?: boolean;
};

export function HomePanelEmptyState({
  icon,
  title,
  subtitle,
  dashboard = false,
  compact = false,
}: HomePanelEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/15 px-4 text-center',
        dashboard ? 'md:flex-1' : '',
        compact ? 'py-8' : dashboard ? 'py-8' : 'py-12',
      )}
    >
      <div
        className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-muted/40 text-muted-foreground/40"
        aria-hidden
      >
        {icon}
      </div>
      <p className="text-[15px] text-muted-foreground font-normal">{title}</p>
      {subtitle ? (
        <p className="mt-1 max-w-[16rem] text-[13px] text-muted-foreground/70 leading-relaxed">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export const HOME_PANEL_TABLE_HEAD_CELL =
  'py-2.5 px-3 text-[11px] font-normal text-muted-foreground uppercase tracking-[0.12em]';

export const HOME_PANEL_TABLE_ROW =
  'bb-grid-row-offscreen border-b border-border/60 last:border-0 odd:bg-muted/10 even:bg-transparent hover:bg-muted/30 bb-transition';

type HomePanelTableShellProps = {
  children: ReactNode;
  dashboard?: boolean;
  maxHeightClass?: string;
};

export function HomePanelTableShell({
  children,
  dashboard = false,
  maxHeightClass,
}: HomePanelTableShellProps) {
  return (
    <div
      className={cn(
        'hidden md:block rounded-2xl border border-border/80 overflow-hidden bb-shadow-sm bg-card/50',
        dashboard && 'md:flex-1 md:min-h-0 md:flex md:flex-col',
      )}
    >
      <div
        className={cn(
          'overflow-y-auto bb-smooth-scroll overscroll-contain',
          dashboard ? 'md:flex-1 md:min-h-0' : maxHeightClass ?? 'max-h-[min(55vh,24rem)]',
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function HomePanelMobileScroll({ children }: { children: ReactNode }) {
  return (
    <div className="md:hidden max-h-[min(60svh,28rem)] overflow-y-auto bb-smooth-scroll overscroll-contain -mx-1 px-1">
      {children}
    </div>
  );
}

export function HomePanelTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80">
      {children}
    </thead>
  );
}
