/** Desktop page shell: bounds height so inner flex scroll works (mobile uses fixed shell on client). */
export const BRANCH_WITHDRAW_PAGE_SHELL_CLASS =
  'max-md:contents md:flex md:h-[calc(100svh-2rem)] md:min-h-0 md:flex-col md:overflow-hidden';

/** Scroll region between pinned header/footer chrome inside branch-withdraw. */
export const BRANCH_WITHDRAW_SCROLL_BODY_CLASS =
  'min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bb-smooth-scroll [scrollbar-width:thin]';

/** Mobile standalone shell between app header and FAB stack. */
export const BRANCH_WITHDRAW_STANDALONE_MOBILE_SHELL_CLASS =
  'max-md:fixed max-md:inset-x-0 max-md:z-0 max-md:top-[72px] max-md:bottom-[calc(11rem+env(safe-area-inset-bottom,0px))]';

export const BRANCH_WITHDRAW_STANDALONE_MOBILE_SHELL_FAB_HIDDEN_CLASS =
  'max-md:bottom-[calc(4rem+env(safe-area-inset-bottom,0px))]';

export const BRANCH_WITHDRAW_STANDALONE_DESKTOP_SHELL_CLASS =
  'md:relative md:h-full md:min-h-0 md:max-h-full';

export const BRANCH_WITHDRAW_ACTION_BAR_CLASS =
  'shrink-0 border-t border-border bg-background py-3 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]';
