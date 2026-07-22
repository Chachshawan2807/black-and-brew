/** Shared layout tokens for bean-orders pages */
export const BEAN_ORDER_PAGE =
  'mx-auto w-full max-w-6xl px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]';

export const BEAN_ORDER_DETAIL_PAGE =
  'mx-auto w-full max-w-4xl px-4 py-6 pb-[calc(2rem+env(safe-area-inset-bottom))]';

export const BEAN_ORDER_CARD =
  'rounded-2xl border border-border bg-card bb-shadow-md overflow-hidden';

export const BEAN_ORDER_LIST_HEADER =
  'bg-muted/50 text-xs font-normal text-muted-foreground border-b border-border bb-shadow-sm';

/** Mobile card shell + desktop zebra row */
export const BEAN_ORDER_LIST_ROW =
  'mx-1.5 mb-2 rounded-xl border border-border/80 bg-card bb-shadow-sm last:mb-1.5 lg:mx-0 lg:mb-0 lg:rounded-none lg:border-0 lg:border-b lg:border-border/60 lg:last:border-b-0 lg:bb-shadow-none lg:odd:bg-muted/12 lg:even:bg-card lg:hover:bg-muted/30';

export const BEAN_ORDER_LIST_CELL =
  'lg:border-r lg:border-border/45 lg:px-4 lg:py-3 lg:last:border-r-0';

export const BEAN_ORDER_INPUT =
  'h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-foreground/10';

/** Desktop list columns: copy | customer | order no | destination | carrier | amount | status */
export const BEAN_ORDER_LIST_GRID =
  'lg:grid-cols-[2.5rem_minmax(0,1.2fr)_minmax(8.5rem,0.95fr)_minmax(5rem,0.8fr)_minmax(6rem,0.85fr)_5.75rem_minmax(12rem,1.3fr)]';
