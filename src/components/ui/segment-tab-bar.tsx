'use client';

import { useCallback, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type SegmentTabItem<T extends string = string> = {
  id: T;
  label: ReactNode;
  /** Optional count shown as a subtle badge */
  count?: number;
  /** Optional icon rendered before the label */
  icon?: ReactNode;
};

type SegmentTabBarProps<T extends string> = {
  tabs: readonly SegmentTabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Accessible name for the tablist */
  ariaLabel: string;
  className?: string;
  /** Equal-width tabs (default) or auto-sized chips in a scroll row */
  layout?: 'segment' | 'scroll';
};

function focusTabAtIndex(container: HTMLElement, index: number) {
  const buttons = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');
  const target = buttons[index];
  if (target) target.focus();
}

export function SegmentTabBar<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  className,
  layout = 'segment',
}: SegmentTabBarProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const container = listRef.current;
      if (!container || tabs.length === 0) return;

      const currentIndex = tabs.findIndex((tab) => tab.id === value);
      if (currentIndex < 0) return;

      let nextIndex = currentIndex;

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          nextIndex = (currentIndex + 1) % tabs.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = tabs.length - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      onChange(tabs[nextIndex].id);
      focusTabAtIndex(container, nextIndex);
    },
    [onChange, tabs, value],
  );

  const isScroll = layout === 'scroll';

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn(
        isScroll
          ? 'flex flex-nowrap gap-2 min-w-min'
          : 'flex gap-1 rounded-2xl border border-border bg-muted/35 p-1 bb-shadow-sm',
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`segment-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`segment-panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 bb-transition duration-200 font-normal whitespace-nowrap touch-manipulation',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              isScroll
                ? cn(
                    'shrink-0 min-h-10 rounded-full border px-3.5 py-2 text-[13px]',
                    isActive
                      ? 'border-foreground bg-foreground text-background bb-shadow-sm'
                      : 'border-border bg-background/80 text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                  )
                : cn(
                    'flex-1 min-h-11 rounded-xl px-3 py-2.5 text-[13px]',
                    isActive
                      ? 'bg-card text-foreground bb-shadow-sm border border-border/60 ring-1 ring-border/40'
                      : 'border border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40',
                  ),
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined ? (
              <span
                className={cn(
                  'inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-px text-[10px] tabular-nums leading-none',
                  isActive
                    ? isScroll
                      ? 'bg-background/20 text-inherit'
                      : 'bg-muted text-muted-foreground'
                    : 'bg-muted/70 text-muted-foreground',
                )}
                aria-hidden
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export type FilterChipItem = {
  id: string;
  label: ReactNode;
  count?: number;
};

type FilterChipBarProps = {
  chips: FilterChipItem[];
  selected: string[];
  onToggle: (id: string) => void;
  /** When every chip is deselected, fall back to this id (default `all`) */
  allId?: string;
  ariaLabel: string;
  className?: string;
};

export function FilterChipBar({
  chips,
  selected,
  onToggle,
  allId = 'all',
  ariaLabel,
  className,
}: FilterChipBarProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn('flex flex-nowrap gap-2 min-w-min', className)}
    >
      {chips.map((chip) => {
        const isActive =
          chip.id === allId
            ? selected.includes(allId)
            : selected.includes(chip.id) && !selected.includes(allId);
        return (
          <button
            key={chip.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onToggle(chip.id)}
            title={typeof chip.label === 'string' ? chip.label : undefined}
            className={cn(
              'inline-flex shrink-0 items-center justify-center gap-1.5 min-h-10 rounded-full border px-3.5 py-2 text-[13px] font-normal whitespace-nowrap bb-transition duration-200 touch-manipulation',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              chip.id !== allId && 'max-w-[12rem] truncate',
              isActive
                ? 'border-foreground bg-foreground text-background bb-shadow-sm'
                : 'border-border bg-background/80 text-muted-foreground hover:bg-muted/50 hover:text-foreground',
            )}
          >
            <span className="truncate">{chip.label}</span>
            {chip.count !== undefined ? (
              <span
                className={cn(
                  'inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-px text-[10px] tabular-nums leading-none',
                  isActive ? 'bg-background/20 text-inherit' : 'bg-muted/70 text-muted-foreground',
                )}
                aria-hidden
              >
                {chip.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
