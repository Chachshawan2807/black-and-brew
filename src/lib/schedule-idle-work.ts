type IdleDeadline = { didTimeout: boolean; timeRemaining: () => number };

type IdleRequestOptions = { timeout?: number };

type IdleRequestCallback = (deadline: IdleDeadline) => void;

type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * Schedules non-critical work after first paint without blocking interaction.
 * Falls back to setTimeout when requestIdleCallback is unavailable.
 */
export function scheduleIdleWork(callback: () => void, options?: { timeout?: number }): () => void {
  if (typeof window === 'undefined') return () => {};

  const idleWindow = window as IdleWindow;
  if (idleWindow.requestIdleCallback) {
    const handle = idleWindow.requestIdleCallback(() => callback(), options);
    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const handle = window.setTimeout(callback, options?.timeout ?? 1);
  return () => window.clearTimeout(handle);
}
