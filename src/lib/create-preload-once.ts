/**
 * Factory for intent-based dynamic import preload helpers.
 * Each instance dedupes its loader on the client only.
 */
export function createPreloadOnce(loader: () => void | Promise<unknown>): {
  preload: () => void;
  resetForTests: () => void;
} {
  let preloaded = false;

  const preload = (): void => {
    if (typeof window === 'undefined' || preloaded) return;
    preloaded = true;
    void loader();
  };

  const resetForTests = (): void => {
    preloaded = false;
  };

  return { preload, resetForTests };
}
