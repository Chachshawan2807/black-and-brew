/**
 * Project-wide outlined UI tokens (soft corners + bordered surfaces).
 * Schedule toolbar pattern: labeled button + optional icon frame.
 */

/** Soft-corner radius for buttons, cards, modals */
export const BB_RADIUS_SOFT = 'rounded-2xl';

/** Icon frame inside labeled buttons */
export const BB_RADIUS_ICON = 'rounded-xl';

/** Shared interactive motion */
export const BB_BTN_MOTION =
  'bb-transition duration-200 active:scale-[0.98] motion-reduce:active:scale-100 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed';

/** Default outlined action button */
export const BB_BTN_OUTLINE =
  `inline-flex items-center justify-center gap-2 h-11 min-h-[44px] px-4 text-sm font-normal ${BB_RADIUS_SOFT} border border-border/80 bg-card text-foreground hover:bg-muted/40 hover:border-border bb-shadow-sm ${BB_BTN_MOTION}`;

/** Outlined primary emphasis (replaces solid fill CTAs) */
export const BB_BTN_OUTLINE_PRIMARY =
  `inline-flex items-center justify-center gap-2 h-11 min-h-[44px] px-4 text-sm font-normal ${BB_RADIUS_SOFT} border-2 border-foreground/85 bg-card text-foreground hover:bg-muted/35 hover:border-foreground bb-shadow-sm ${BB_BTN_MOTION}`;

/** Outlined danger */
export const BB_BTN_OUTLINE_DANGER =
  `inline-flex items-center justify-center gap-2 h-11 min-h-[44px] px-4 text-sm font-normal ${BB_RADIUS_SOFT} border border-red-500/80 bg-card text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 ${BB_BTN_MOTION}`;

/** Compact outlined button */
export const BB_BTN_OUTLINE_SM =
  `inline-flex h-9 min-h-[44px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap ${BB_RADIUS_SOFT} border border-border/80 bg-card px-3.5 text-xs text-foreground hover:bg-muted/35 hover:bb-shadow-sm ${BB_BTN_MOTION}`;

/** Icon-only control with visible border */
export const BB_BTN_ICON =
  `inline-flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center ${BB_RADIUS_SOFT} border border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:border-border ${BB_BTN_MOTION}`;

export const BB_BTN_ICON_ACTIVE = 'text-foreground bg-muted/35 border-border';

/** Black outline + stroke glyph for icon badges and nested icon frames */
export const BB_ICON_BADGE_OUTLINE =
  'border-black/75 text-black [&_svg]:text-black dark:border-black/80 dark:text-black dark:[&_svg]:text-black';

/** Icon frame nested inside labeled buttons (toolbar pattern) */
export const BB_ICON_FRAME =
  `inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border bg-muted/25 bb-transition group-hover:bg-muted/40 group-disabled:opacity-60 ${BB_ICON_BADGE_OUTLINE}`;

/** Modal / panel header icon badge */
export const BB_ICON_BADGE_BASE =
  `inline-flex shrink-0 items-center justify-center border ${BB_RADIUS_SOFT} bb-transition duration-200 ${BB_ICON_BADGE_OUTLINE}`;

/** Pastel fills for icon badges (pair with BB_ICON_BADGE_BASE; border + glyph come from base) */
export const BB_ICON_BADGE_FILL = {
  neutral: 'bg-muted/25',
  muted: 'bg-muted/20',
  mutedStrong: 'bg-muted/30',
  mutedPanel: 'bg-muted/35',
  coffee: 'bg-[#f5efe6]/80 dark:bg-muted/30',
  payment: 'bg-emerald-50/70 dark:bg-emerald-950/35',
  shipping: 'bg-[#e8f4ff]/80 dark:bg-blue-950/30',
  success: 'bg-emerald-50/70 dark:bg-emerald-950/35',
  warn: 'bg-amber-50/70 dark:bg-amber-950/35',
  accent: 'bg-emerald-50/60 dark:bg-emerald-950/30',
  calendar: 'bb-pastel-surface bg-[#ffda66]',
  schedule: 'bb-pastel-surface bg-[#e6f0ff]',
  insight: 'bb-pastel-surface bg-[#ffe0a8]',
  security: 'bb-pastel-surface bg-[#ffe4e6]',
  stockIn: 'bb-pastel-surface bg-[#d4edda]',
  stockOut: 'bb-pastel-surface bg-[#f8d7da]',
  stockAdjust: 'bb-pastel-surface bg-[#fff3cd]',
  order: 'bb-pastel-surface bg-[#d1ecf1]',
} as const;

/** Modal close control */
export const BB_BTN_CLOSE =
  `inline-flex h-10 w-10 items-center justify-center ${BB_RADIUS_SOFT} border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/35 hover:border-border bb-transition duration-200 active:scale-95 motion-reduce:active:scale-100 disabled:opacity-50`;

/** Data card / content panel shell */
export const BB_DATA_CARD =
  `${BB_RADIUS_SOFT} border border-border bg-card bb-shadow-md overflow-visible`;

/** Flat list/table shell (no stacked shadow) */
export const BB_DATA_LIST =
  `${BB_RADIUS_SOFT} border border-border bg-card overflow-hidden`;

/** Form field with soft corners */
export const BB_FIELD_INPUT =
  `w-full h-11 ${BB_RADIUS_SOFT} border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30 bb-transition`;

/** Selected filter chip / scroll tab (outlined, not filled) */
export const BB_CHIP_SELECTED =
  'border-foreground/85 bg-card text-foreground bb-shadow-sm ring-1 ring-foreground/10';

/** Idle filter chip / scroll tab */
export const BB_CHIP_IDLE =
  'border-border/80 bg-background/80 text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:border-border';

/** FAB outlined shell (pastel fill + border applied separately) */
export const BB_FAB_SHELL =
  'flex items-center justify-center rounded-2xl border-2 border-foreground/80 bb-shadow-lg bb-transition';

/** Ghost text action (minimal border on hover) */
export const BB_BTN_GHOST =
  `inline-flex items-center gap-1.5 ${BB_RADIUS_SOFT} border border-transparent px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/35 hover:border-border/60 ${BB_BTN_MOTION}`;

/** Pastel surface: keeps text/icons black in both themes (pair with hex bg fills) */
export const BB_PASTEL_SURFACE = 'bb-pastel-surface';

/** Combine pastel surface + background fill (shift cards use per-tone borders via inline style) */
export function bbPastelClass(bgClass: string): string {
  return `${BB_PASTEL_SURFACE} ${bgClass}`;
}
