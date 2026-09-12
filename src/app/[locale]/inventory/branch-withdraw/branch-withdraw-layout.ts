/** Page shell: bounded height on mobile/desktop so inner scroll regions work without fixed positioning. */
export const BRANCH_WITHDRAW_PAGE_SHELL_CLASS =
  'flex min-h-0 flex-col max-md:min-h-[calc(100svh-72px)] md:h-[calc(100svh-2rem)] md:overflow-hidden';

/** Scroll region between pinned header/footer chrome inside branch-withdraw. */
export const BRANCH_WITHDRAW_SCROLL_BODY_CLASS =
  'min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bb-smooth-scroll';

/** Mobile standalone shell: flex column inside main landmark (avoids fixed + layout containment bugs). */
export const BRANCH_WITHDRAW_STANDALONE_MOBILE_SHELL_CLASS =
  'max-md:flex max-md:min-h-0 max-md:flex-1 max-md:flex-col';

export const BRANCH_WITHDRAW_STANDALONE_DESKTOP_SHELL_CLASS =
  'md:relative md:h-full md:min-h-0 md:max-h-full';

export const BRANCH_WITHDRAW_ACTION_BAR_CLASS =
  'rounded-2xl border border-border bg-card p-3 shadow-sm';

/** Embedded secretary overlay: full-width toolbar flush under panel header. */
export const BRANCH_WITHDRAW_EMBEDDED_TOOLBAR_CLASS =
  'shrink-0 -mx-4 -mt-3 border-b border-border bg-muted/30 px-4 py-3';

/** Embedded secretary overlay: scroll region on muted surface for section contrast. */
export const BRANCH_WITHDRAW_EMBEDDED_SHELL_CLASS =
  'flex min-h-0 flex-1 flex-col overflow-hidden text-foreground';
