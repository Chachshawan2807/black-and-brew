'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { completeViewTransitionNavigation } from '@/lib/view-transition-navigation-state';
import { navigateWithViewTransition, navigateWithoutViewTransition, shouldUseViewTransition } from '@/lib/view-transition';
import { normalizeAppPath } from '@/lib/normalize-app-path';
import { warmRouteNavigation } from '@/lib/warm-route-navigation';
import { useMobileNavDrawer } from '@/hooks/use-mobile-nav-drawer';

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

/** Squared px movement above which a touch sequence is treated as scroll, not tap. */
const INSTANT_NAV_TOUCH_MOVE_THRESHOLD_SQ = 12 * 12;

type PendingInstantTouch = {
  anchor: HTMLAnchorElement;
  href: string;
  pointerId: number;
  startX: number;
  startY: number;
};

function resolveInstantNavAnchor(target: EventTarget | null): HTMLAnchorElement | null {
  if (!(target instanceof Element)) return null;

  const anchor = target.closest('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.dataset.bbNav !== 'instant') return null;
  if (anchor.target === '_blank' || anchor.hasAttribute('download')) return null;

  const rawHref = anchor.getAttribute('href');
  if (!rawHref || !isInternalAppHref(rawHref, window.location.origin)) return null;

  return anchor;
}

/**
 * Wraps same-origin in-app link clicks with the View Transitions API for native-feel route changes.
 */
export function ViewTransitionNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const closeDrawerForNavigation = useMobileNavDrawer((state) => state.closeDrawerForNavigation);

  useEffect(() => {
    completeViewTransitionNavigation();
  }, [pathname]);

  useEffect(() => {
    let pendingInstantTouch: PendingInstantTouch | null = null;
    let suppressInstantNavClick = false;

    const navigateInstantHref = (href: string) => {
      const nextPath = normalizeAppPath(href.split(/[?#]/)[0]);
      const currentPath = normalizeAppPath(window.location.pathname);
      if (nextPath === currentPath) return;

      if (window.innerWidth < 768) {
        closeDrawerForNavigation();
      }

      navigateWithoutViewTransition(router.push, href);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;

      const anchor = resolveInstantNavAnchor(event.target);
      if (!anchor) return;

      const href = normalizeInternalHref(anchor.getAttribute('href')!, window.location.origin);
      warmRouteNavigation(href, router.prefetch);

      if (event.pointerType === 'touch') {
        pendingInstantTouch = {
          anchor,
          href,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
        };
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' || event.button !== 0) return;
      if (!pendingInstantTouch || pendingInstantTouch.pointerId !== event.pointerId) return;

      const { anchor, href, startX, startY } = pendingInstantTouch;
      pendingInstantTouch = null;

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (dx * dx + dy * dy > INSTANT_NAV_TOUCH_MOVE_THRESHOLD_SQ) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target !== anchor && !anchor.contains(target)) return;

      event.preventDefault();
      suppressInstantNavClick = true;
      navigateInstantHref(href);
    };

    const onPointerCancel = (event: PointerEvent) => {
      if (pendingInstantTouch?.pointerId === event.pointerId) {
        pendingInstantTouch = null;
      }
    };

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
      const nextPath = normalizeAppPath(href.split(/[?#]/)[0]);
      const currentPath = normalizeAppPath(window.location.pathname);
      if (nextPath === currentPath) return;

      const isInstantNav = anchor.dataset.bbNav === 'instant';
      if (isInstantNav && suppressInstantNavClick) {
        suppressInstantNavClick = false;
        event.preventDefault();
        return;
      }

      if (window.innerWidth < 768) {
        closeDrawerForNavigation();
      }

      if (!shouldUseViewTransition() && !isInstantNav) return;

      event.preventDefault();
      if (isInstantNav) {
        navigateWithoutViewTransition(router.push, href);
        return;
      }
      navigateWithViewTransition(router.push, href);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('pointercancel', onPointerCancel, true);
    document.addEventListener('click', onDocumentClick, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('pointercancel', onPointerCancel, true);
      document.removeEventListener('click', onDocumentClick, true);
    };
  }, [closeDrawerForNavigation, router]);

  return null;
}
