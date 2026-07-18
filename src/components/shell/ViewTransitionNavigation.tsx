'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { completeViewTransitionNavigation } from '@/lib/view-transition-navigation-state';
import { navigateWithViewTransition, shouldUseViewTransition } from '@/lib/view-transition';

function isModifiedClick(event: MouseEvent): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

function isInternalAppHref(href: string, origin: string): boolean {
  if (!href || href.startsWith('#')) return false;
  if (href.startsWith('/')) return true;

  try {
    const url = new URL(href, origin);
    return url.origin === origin && url.pathname.startsWith('/');
  } catch {
    return false;
  }
}

function normalizeInternalHref(href: string, origin: string): string {
  if (href.startsWith('/')) return href;
  const url = new URL(href, origin);
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Wraps same-origin in-app link clicks with the View Transitions API for native-feel route changes.
 */
export function ViewTransitionNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    completeViewTransitionNavigation();
  }, [pathname]);

  useEffect(() => {
    if (!shouldUseViewTransition()) return;

    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isModifiedClick(event)) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      if (anchor.getAttribute('rel')?.includes('external')) return;

      const rawHref = anchor.getAttribute('href');
      if (!rawHref || !isInternalAppHref(rawHref, window.location.origin)) return;

      const href = normalizeInternalHref(rawHref, window.location.origin);
      const nextPath = href.split(/[?#]/)[0];
      const currentPath = window.location.pathname;
      if (nextPath === currentPath) return;

      event.preventDefault();
      navigateWithViewTransition(router.push, href);
    };

    document.addEventListener('click', onDocumentClick, true);
    return () => document.removeEventListener('click', onDocumentClick, true);
  }, [router]);

  return null;
}
