import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  BB_BTN_GHOST,
  BB_BTN_OUTLINE,
  BB_BTN_OUTLINE_DANGER,
  BB_BTN_OUTLINE_PRIMARY,
  BB_BTN_OUTLINE_SM,
  BB_CHIP_IDLE,
  BB_CHIP_SELECTED,
  BB_DATA_CARD,
  BB_FIELD_INPUT,
  BB_ICON_BADGE_BASE,
  BB_ICON_BADGE_FILL,
  BB_RADIUS_ICON,
  BB_RADIUS_SOFT,
} from '@/lib/ui-outlined-tokens';

export const SETTINGS_SECTION = cn(BB_DATA_CARD, 'overflow-hidden');

export const SETTINGS_SECTION_BODY = 'p-4 md:p-5';

export const SETTINGS_BTN = BB_BTN_OUTLINE;

export const SETTINGS_BTN_PRIMARY = BB_BTN_OUTLINE_PRIMARY;

export const SETTINGS_BTN_DANGER = BB_BTN_OUTLINE_DANGER;

export const SETTINGS_BTN_SM = BB_BTN_OUTLINE_SM;

export const SETTINGS_BTN_GHOST = BB_BTN_GHOST;

export const SETTINGS_FIELD = BB_FIELD_INPUT;

export const SETTINGS_CHIP = `${BB_RADIUS_SOFT} px-3 py-1.5 min-h-[44px] text-[12px] bb-transition border`;

export const SETTINGS_CHIP_SELECTED = `${SETTINGS_CHIP} ${BB_CHIP_SELECTED}`;

export const SETTINGS_CHIP_IDLE = `${SETTINGS_CHIP} ${BB_CHIP_IDLE}`;

export const SETTINGS_ENTRY = `${BB_RADIUS_SOFT} border border-border bg-card px-3.5 py-3 bb-transition`;

export const SETTINGS_ENTRY_DANGER = `${BB_RADIUS_SOFT} border border-red-500/15 bg-red-500/[0.04] px-3.5 py-3 bb-transition`;

export const SETTINGS_PANEL_DANGER = `${BB_RADIUS_SOFT} border border-red-500/15 bg-red-500/[0.03] px-3.5 py-3 space-y-3`;

export const SETTINGS_LIST_ITEM = `${BB_RADIUS_SOFT} border border-border bg-card px-3 py-2.5`;

export const SETTINGS_STATUS_CARD = `${BB_RADIUS_SOFT} border border-border bg-card px-4 py-3`;

export const SETTINGS_EXPAND_BTN = cn(
  BB_BTN_OUTLINE_SM,
  'w-full text-[11px] text-muted-foreground hover:text-foreground',
);

export function settingsSwitchTrack(checked: boolean, disabled?: boolean) {
  return cn(
    'relative h-7 w-12 shrink-0 bb-transition border-2',
    BB_RADIUS_ICON,
    checked
      ? 'border-black bg-black dark:border-foreground dark:bg-foreground'
      : 'border-border/80 bg-background',
    disabled && 'cursor-not-allowed opacity-50',
  );
}

export function settingsSwitchThumb(checked: boolean) {
  return cn(
    'absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-lg border-2 border-black/75 bg-card bb-shadow-sm bb-transition',
    'dark:border-black/80 dark:bg-background',
    checked ? 'left-[calc(100%-1.375rem)]' : 'left-0.5',
  );
}

type SettingsIconBadgeProps = {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'neutral' | 'danger' | 'muted';
  className?: string;
};

const BADGE_SIZE = {
  sm: 'h-7 w-7 rounded-xl',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
} as const;

const BADGE_TONE = {
  neutral: BB_ICON_BADGE_FILL.neutral,
  danger: BB_ICON_BADGE_FILL.security,
  muted: BB_ICON_BADGE_FILL.mutedPanel,
} as const;

export function SettingsIconBadge({
  children,
  size = 'lg',
  tone = 'muted',
  className,
}: SettingsIconBadgeProps) {
  return (
    <div
      className={cn(BB_ICON_BADGE_BASE, BADGE_SIZE[size], BADGE_TONE[tone], className)}
      aria-hidden
    >
      {children}
    </div>
  );
}
