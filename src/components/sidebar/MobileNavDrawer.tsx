'use client';

import {
  useCallback,
  useEffect,
  useRef,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import Image from 'next/image';
import Menu from '@/components/sidebar/Menu';
import {
  useMobileNavDrawer,
  type MobileNavDrawerActions,
} from '@/hooks/use-mobile-nav-drawer';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

function drawerScrollBehavior(reduced: boolean): ScrollBehavior {
  return reduced ? 'auto' : 'smooth';
}

function supportsPopoverApi(): boolean {
  return typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
}

function supportsScrollInitialTarget(): boolean {
  return typeof CSS !== 'undefined' && CSS.supports('scroll-initial-target', 'nearest');
}

function supportsScrollTimeline(): boolean {
  return typeof CSS !== 'undefined' && CSS.supports('animation-timeline', 'scroll()');
}

function doubleFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export function MobileNavDrawer() {
  const reduced = usePrefersReducedMotion();
  const drawerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const popoverSupported = useRef(supportsPopoverApi());
  const setIsOpen = useMobileNavDrawer((s) => s.setIsOpen);
  const registerActions = useMobileNavDrawer((s) => s.registerActions);

  const syncBackdropFromScroll = useCallback(() => {
    const drawer = drawerRef.current;
    const scroller = scrollerRef.current;
    const sheet = sheetRef.current;
    if (!drawer || !scroller || !sheet || supportsScrollTimeline()) return;
    const width = sheet.offsetWidth || 1;
    const ratio = Math.max(0, Math.min(1, 1 - scroller.scrollLeft / width));
    drawer.style.setProperty('--drawer-backdrop', String(ratio));
  }, []);

  const hidePopoverIfNeeded = useCallback(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;
    if (popoverSupported.current && drawer.matches(':popover-open')) {
      drawer.hidePopover();
    } else {
      drawer.classList.remove('bb-mobile-nav-drawer--open');
    }
  }, []);

  const onDrawerOpened = useCallback(() => {
    setIsOpen(true);
    sheetRef.current?.focus();
  }, [setIsOpen]);

  const onDrawerClosed = useCallback(() => {
    hidePopoverIfNeeded();
    setIsOpen(false);
  }, [hidePopoverIfNeeded, setIsOpen]);

  const closeDrawer = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTo({
      left: scroller.offsetWidth,
      behavior: drawerScrollBehavior(reduced),
    });
  }, [reduced]);

  const openDrawer = useCallback(async () => {
    const drawer = drawerRef.current;
    const scroller = scrollerRef.current;
    if (!drawer || !scroller) return;

    if (popoverSupported.current) {
      if (!drawer.matches(':popover-open')) {
        drawer.showPopover();
      }
    } else {
      drawer.classList.add('bb-mobile-nav-drawer--open');
    }

    if (!supportsScrollInitialTarget()) {
      scroller.scrollTo({ left: scroller.offsetWidth, behavior: 'instant' as ScrollBehavior });
      await doubleFrame();
    }

    scroller.scrollTo({ left: 0, behavior: drawerScrollBehavior(reduced) });
    syncBackdropFromScroll();
  }, [syncBackdropFromScroll, reduced]);

  useEffect(() => {
    const actions: MobileNavDrawerActions = { open: openDrawer, close: closeDrawer };
    registerActions(actions);
    return () => registerActions(null);
  }, [closeDrawer, openDrawer, registerActions]);

  useEffect(() => {
    const drawer = drawerRef.current;
    const sheet = sheetRef.current;
    if (!drawer || !sheet) return;

    const visibleThreshold = 1 / Math.max(window.innerWidth, 1);
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1);
        if (!entry) return;
        if (entry.intersectionRatio < visibleThreshold) onDrawerClosed();
        if (entry.intersectionRatio === 1) onDrawerOpened();
      },
      { root: drawer, threshold: [visibleThreshold, 1] },
    );

    observer.observe(sheet);
    return () => observer.disconnect();
  }, [onDrawerClosed, onDrawerOpened]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const drawer = drawerRef.current;
    if (!scroller || !drawer || supportsScrollTimeline()) return;

    const onScroll = () => syncBackdropFromScroll();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, [syncBackdropFromScroll]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const drawer = drawerRef.current;
      if (!drawer) return;
      const isVisible =
        popoverSupported.current
          ? drawer.matches(':popover-open')
          : drawer.classList.contains('bb-mobile-nav-drawer--open');
      if (isVisible) closeDrawer();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeDrawer]);

  const handleDrawerClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const sheet = sheetRef.current;
    if (sheet && !sheet.contains(event.target as Node)) {
      closeDrawer();
    }
  };

  return (
    <div
      ref={drawerRef}
      id="bb-nav-drawer"
      popover="manual"
      className="bb-mobile-nav-drawer md:hidden"
      onClick={handleDrawerClick}
    >
      <div ref={scrollerRef} className="bb-mobile-nav-drawer__scroller">
        <nav
          ref={sheetRef}
          className="bb-mobile-nav-drawer__sheet"
          tabIndex={-1}
          aria-label="เมนูนำทาง"
        >
          <div className="px-2 pt-4 pb-2 border-b border-black/5 dark:border-white/10">
            <Image
              src="/images/logo.png"
              alt="BLACK AND BREW"
              width={200}
              height={68}
              className="dark:invert dark:brightness-0 dark:opacity-90"
              style={{
                width: '200px',
                height: '68px',
                objectFit: 'contain',
                objectPosition: 'left center',
              }}
              priority
            />
          </div>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col pl-2 pr-3 py-2">
            <Menu isOpen={true} />
          </div>
        </nav>
      </div>
    </div>
  );
}
