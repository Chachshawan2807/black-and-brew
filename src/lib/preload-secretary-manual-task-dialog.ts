import { createPreloadOnce } from '@/lib/create-preload-once';

const {
  preload: preloadSecretaryManualTaskDialog,
  resetForTests: resetSecretaryManualTaskDialogPreloadForTests,
} = createPreloadOnce(() =>
  import('@/app/[locale]/secretary/_components/SecretaryManualTaskDialog'),
);

/** Warm the secretary manual task dialog chunk before the user opens it. */
export { preloadSecretaryManualTaskDialog };

/** @internal Vitest only */
export { resetSecretaryManualTaskDialogPreloadForTests };
