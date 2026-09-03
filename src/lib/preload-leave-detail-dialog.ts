let preloaded = false;

/** Warm the dashboard leave/holiday detail dialog chunk before the user opens it. */
export function preloadLeaveDetailDialog(): void {
  if (typeof window === 'undefined' || preloaded) return;
  preloaded = true;
  void import('@/app/[locale]/dashboard/_components/LeaveDetailDialog');
}

/** @internal Vitest only */
export function resetLeaveDetailDialogPreloadForTests(): void {
  preloaded = false;
}
