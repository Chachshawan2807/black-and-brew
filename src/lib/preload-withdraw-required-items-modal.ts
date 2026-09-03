import { createPreloadOnce } from '@/lib/create-preload-once';

const {
  preload: preloadWithdrawRequiredItemsModal,
  resetForTests: resetWithdrawRequiredItemsModalPreloadForTests,
} = createPreloadOnce(() =>
  import('@/app/[locale]/inventory/_components/WithdrawRequiredItemsModal'),
);

/** Warm the withdraw-required-items modal chunk before the user opens it. */
export { preloadWithdrawRequiredItemsModal };

/** @internal Vitest only */
export { resetWithdrawRequiredItemsModalPreloadForTests };
