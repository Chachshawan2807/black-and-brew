let pendingNavigationResolve: (() => void) | null = null;

export function beginViewTransitionNavigation(): Promise<void> | undefined {
  if (pendingNavigationResolve) {
    pendingNavigationResolve();
    pendingNavigationResolve = null;
  }

  return new Promise<void>((resolve) => {
    pendingNavigationResolve = resolve;
  });
}

export function completeViewTransitionNavigation(): void {
  pendingNavigationResolve?.();
  pendingNavigationResolve = null;
}

export function resetViewTransitionNavigationForTests(): void {
  pendingNavigationResolve = null;
}
