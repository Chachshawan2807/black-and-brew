/** Unblock view transitions if route paint never completes (stuck navigation). */
export const VIEW_TRANSITION_NAV_TIMEOUT_MS = 3_000;

let pendingNavigationResolve: (() => void) | null = null;
let pendingNavigationTimeout: ReturnType<typeof setTimeout> | null = null;

function clearPendingNavigationTimeout(): void {
  if (pendingNavigationTimeout !== null) {
    clearTimeout(pendingNavigationTimeout);
    pendingNavigationTimeout = null;
  }
}

export function beginViewTransitionNavigation(): Promise<void> | undefined {
  if (pendingNavigationResolve) {
    pendingNavigationResolve();
    pendingNavigationResolve = null;
  }
  clearPendingNavigationTimeout();

  return new Promise<void>((resolve) => {
    pendingNavigationResolve = resolve;
    pendingNavigationTimeout = setTimeout(() => {
      completeViewTransitionNavigation();
    }, VIEW_TRANSITION_NAV_TIMEOUT_MS);
  });
}

export function completeViewTransitionNavigation(): void {
  pendingNavigationResolve?.();
  pendingNavigationResolve = null;
  clearPendingNavigationTimeout();
}

export function resetViewTransitionNavigationForTests(): void {
  pendingNavigationResolve = null;
  clearPendingNavigationTimeout();
}
