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

/** Icon frame nested inside labeled buttons (toolbar pattern) */
export const BB_ICON_FRAME =
  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/25 text-foreground bb-transition group-hover:bg-muted/40 group-hover:border-border/80 group-disabled:opacity-60';

/** Modal / panel header icon badge */
export const BB_ICON_BADGE_BASE =
  `inline-flex shrink-0 items-center justify-center border ${BB_RADIUS_SOFT} bb-transition duration-200`;

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
  'flex items-center justify-center rounded-full border bb-shadow-lg bb-transition';

/** Ghost text action (minimal border on hover) */
export const BB_BTN_GHOST =
  `inline-flex items-center gap-1.5 ${BB_RADIUS_SOFT} border border-transparent px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/35 hover:border-border/60 ${BB_BTN_MOTION}`;
