/** Shared layout tokens for bean-orders pages */
export const BEAN_ORDER_PAGE =
  'mx-auto w-full max-w-6xl px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]';

export const BEAN_ORDER_DETAIL_PAGE =
  'mx-auto w-full max-w-4xl px-4 py-6 pb-[calc(2rem+env(safe-area-inset-bottom))]';

export const BEAN_ORDER_CARD =
  'rounded-2xl border border-border bg-card bb-shadow-md overflow-visible';

/** List/table shell — flat border only (shadow stacks with border at the bottom edge). */
export const BEAN_ORDER_LIST_CARD =
  'rounded-2xl border border-border bg-card overflow-hidden';

export const BEAN_ORDER_LIST_HEADER =
  'bg-muted/50 text-xs font-normal text-muted-foreground';

/** Mobile card shell + desktop zebra row (desktop separators: parent [&>li:not(:last-child)]:border-b). */
export const BEAN_ORDER_LIST_ROW =
  'mx-1.5 mb-2 rounded-xl border border-border/80 bg-card last:mb-1.5 lg:mx-0 lg:mb-0 lg:rounded-none lg:border-0 lg:odd:bg-muted/12 lg:even:bg-card lg:hover:bg-muted/30';

export const BEAN_ORDER_LIST_CELL =
  'lg:border-r lg:border-border/45 lg:px-4 lg:py-3 lg:last:border-r-0';

export const BEAN_ORDER_INPUT =
  'h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-foreground/10';

/** Hover/press motion shared by bean-orders buttons and button-like links */
export const BEAN_ORDER_BTN_MOTION =
  'bb-transition cursor-pointer hover:brightness-[0.98] active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100 disabled:pointer-events-none';

/** Stronger motion for solid primary CTAs (confirm payment, save shipping, etc.) */
export const BEAN_ORDER_BTN_PRIMARY_MOTION =
  'bb-transition cursor-pointer shadow-sm hover:scale-[1.02] hover:bb-shadow-md active:scale-[0.96] active:brightness-95 disabled:opacity-50 disabled:shadow-none disabled:hover:scale-100 disabled:active:scale-100 disabled:cursor-not-allowed disabled:pointer-events-none';

export const BEAN_ORDER_ACTION_BTN_BASE =
  `inline-flex h-11 shrink-0 items-center justify-center rounded-full px-5 text-sm disabled:opacity-50 ${BEAN_ORDER_BTN_MOTION}`;

export const BEAN_ORDER_ACTION_BTN =
  `inline-flex h-11 shrink-0 items-center justify-center rounded-full px-5 text-sm bg-foreground text-background ${BEAN_ORDER_BTN_PRIMARY_MOTION}`;

/** Light green pastel — confirm payment CTA */
export const BEAN_ORDER_ACTION_BTN_CONFIRM =
  `inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-[#c3e6cb] bg-[#d4edda] px-5 text-sm bb-pastel-surface text-black ${BEAN_ORDER_BTN_PRIMARY_MOTION}`;

export const BEAN_ORDER_PAYMENT_SHIPPING_GRID =
  'grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8';

export const BEAN_ORDER_PAYMENT_COLUMN =
  'min-w-0 space-y-3 lg:pr-8';

export const BEAN_ORDER_SHIPPING_COLUMN =
  'min-w-0 space-y-3 border-t-2 border-border pt-6 lg:border-l-2 lg:border-t-0 lg:pl-8 lg:pt-0';

export const BEAN_ORDER_PAYMENT_ACTIONS =
  'flex w-[9.75rem] shrink-0 flex-col justify-start gap-2 self-start';

export const BEAN_ORDER_PAYMENT_BODY =
  'flex min-h-[9rem] items-start gap-3';

export const BEAN_ORDER_PAYMENT_SLIP_SLOT =
  'min-h-[9rem] min-w-0 flex-1 self-stretch';

export const BEAN_ORDER_ACTION_BTN_OUTLINE =
  `${BEAN_ORDER_ACTION_BTN_BASE} border border-border bg-background text-foreground hover:bg-muted/35 hover:bb-shadow-sm`;

export const BEAN_ORDER_ACTION_BTN_DANGER =
  `${BEAN_ORDER_ACTION_BTN_BASE} border border-red-500 bg-background text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20`;

export const BEAN_ORDER_BTN_SM_OUTLINE =
  `inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs text-foreground disabled:opacity-50 ${BEAN_ORDER_BTN_MOTION} hover:bg-muted/35 hover:bb-shadow-sm`;

export const BEAN_ORDER_BTN_SM_DANGER =
  `inline-flex h-9 items-center gap-1.5 rounded-full border border-red-500 bg-background px-3 text-xs text-red-600 disabled:opacity-50 ${BEAN_ORDER_BTN_MOTION} hover:bg-red-50 dark:hover:bg-red-950/20`;

export const BEAN_ORDER_BTN_GHOST =
  `inline-flex items-center gap-1 rounded-full px-3 text-sm ${BEAN_ORDER_BTN_MOTION} hover:bg-muted/35 active:bg-muted/45`;

export const BEAN_ORDER_BTN_LIST =
  `w-full px-3 py-2 text-left text-sm ${BEAN_ORDER_BTN_MOTION} hover:bg-muted/35 active:bg-muted/45`;

export const BEAN_ORDER_BTN_PRIMARY_FULL =
  `h-12 w-full rounded-full bg-foreground text-background text-sm ${BEAN_ORDER_BTN_PRIMARY_MOTION}`;

export const BEAN_ORDER_BTN_PRIMARY_LINK =
  `inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm text-background ${BEAN_ORDER_BTN_PRIMARY_MOTION}`;

export const BEAN_ORDER_BTN_PASTEL_FULL =
  `bb-pastel-surface flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#bee5eb] bg-[#d1ecf1] text-sm text-black disabled:opacity-50 ${BEAN_ORDER_BTN_MOTION} hover:brightness-[0.97]`;

export const BEAN_ORDER_BTN_ICON =
  `inline-flex items-center justify-center rounded-full ${BEAN_ORDER_BTN_MOTION} hover:bg-muted/50 hover:text-foreground hover:bb-shadow-sm active:bg-muted/60`;

export const BEAN_ORDER_BTN_DIALOG =
  `rounded-xl border border-border bg-background px-3 py-2 text-sm ${BEAN_ORDER_BTN_MOTION} hover:bg-muted/35`;

export const BEAN_ORDER_BTN_DIALOG_PRIMARY =
  `rounded-xl bg-foreground px-3 py-2 text-sm text-background ${BEAN_ORDER_BTN_PRIMARY_MOTION}`;

export const BEAN_ORDER_BTN_DIALOG_DANGER =
  `rounded-xl border border-red-500 bg-background px-3 py-2 text-sm text-red-600 ${BEAN_ORDER_BTN_MOTION} hover:bg-red-50 dark:hover:bg-red-950/20`;

export const BEAN_ORDER_BTN_TOGGLE =
  `h-11 shrink-0 rounded-full border px-4 text-sm ${BEAN_ORDER_BTN_MOTION}`;

export const BEAN_ORDER_BTN_DANGER_GHOST =
  `inline-flex h-11 items-center justify-center gap-1 self-center rounded-full px-2 text-sm text-red-600 ${BEAN_ORDER_BTN_MOTION} hover:bg-red-50 active:bg-red-100/80 dark:hover:bg-red-950/20`;

export const BEAN_ORDER_BTN_SLIP =
  `group mr-auto inline-flex flex-col items-stretch overflow-hidden rounded-xl border border-border bg-muted/20 text-left ${BEAN_ORDER_BTN_MOTION} hover:bg-muted/30 active:scale-[0.99]`;

export const BEAN_ORDER_BTN_SLIP_PANEL =
  `group flex h-full min-h-[9rem] w-full flex-col overflow-hidden rounded-xl border border-border bg-muted/20 text-left ${BEAN_ORDER_BTN_MOTION} hover:bg-muted/30 active:scale-[0.99]`;

/** Desktop list/table columns: copy | customer | order no | destination | carrier | amount | status */
export const BEAN_ORDER_LIST_GRID =
  'lg:grid-cols-[2.5rem_minmax(0,1.2fr)_minmax(8.5rem,0.95fr)_minmax(5rem,0.8fr)_minmax(6rem,0.85fr)_5.75rem_minmax(12rem,1.3fr)]';
