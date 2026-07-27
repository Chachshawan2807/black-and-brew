import {
  beginViewTransitionNavigation,
  completeViewTransitionNavigation,
} from '@/lib/view-transition-navigation-state';

export function supportsViewTransition(): boolean {
  return typeof document !== 'undefined' && typeof document.startViewTransition === 'function';
}

export function prefersReducedViewMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function shouldUseViewTransition(): boolean {
  return supportsViewTransition() && !prefersReducedViewMotion();
}

type NavigateFn = (href: string) => void;

/** Bumps on every navigate so superseded view-transition callbacks skip stale router.push. */
let navigationGeneration = 0;

export function resetViewTransitionNavigationGenerationForTests(): void {
  navigationGeneration = 0;
}

/**
 * Cancel in-flight view-transition soft navigations so a later raw/query navigation
 * cannot be overwritten by a slow prior route (e.g. inventory/count).
 */
export function invalidatePendingViewTransitionNavigations(): void {
  navigationGeneration += 1;
  completeViewTransitionNavigation();
}

/**
 * Navigate with the View Transitions API.
 * Calls `navigate` synchronously inside the update callback so App Router can
 * cancel in-flight soft navigations, and ignores superseded transition callbacks
 * (prevents slow prior routes like inventory/count from bouncing the UI back).
 */
export function navigateWithViewTransition(navigate: NavigateFn, href: string): void {
  const generation = ++navigationGeneration;

  if (!shouldUseViewTransition()) {
    navigate(href);
    return;
  }

  const waitForRoutePaint = beginViewTransitionNavigation();

  document.startViewTransition(() => {
    if (generation !== navigationGeneration) {
      return waitForRoutePaint;
    }
    navigate(href);
    return waitForRoutePaint;
  });
}

/**
 * Soft navigate without a view-transition animation (query-param updates, etc.).
 * Still invalidates pending VT navigations so stale callbacks cannot bounce the route.
 */
export function navigateWithoutViewTransition(navigate: NavigateFn, href: string): void {
  invalidatePendingViewTransitionNavigations();
  navigate(href);
}
