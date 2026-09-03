import { createPreloadOnce } from '@/lib/create-preload-once';

const { preload: preloadLeaveDetailDialog, resetForTests: resetLeaveDetailDialogPreloadForTests } =
  createPreloadOnce(() => import('@/app/[locale]/dashboard/_components/LeaveDetailDialog'));

/** Warm the dashboard leave/holiday detail dialog chunk before the user opens it. */
export { preloadLeaveDetailDialog };

/** @internal Vitest only */
export { resetLeaveDetailDialogPreloadForTests };
