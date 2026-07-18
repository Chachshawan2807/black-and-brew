import { startTransition } from 'react';
import { beginViewTransitionNavigation } from '@/lib/view-transition-navigation-state';

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

export function navigateWithViewTransition(navigate: NavigateFn, href: string): void {
  if (!shouldUseViewTransition()) {
    navigate(href);
    return;
  }

  const waitForRoutePaint = beginViewTransitionNavigation();

  document.startViewTransition(() => {
    startTransition(() => {
      navigate(href);
    });
    return waitForRoutePaint;
  });
}
