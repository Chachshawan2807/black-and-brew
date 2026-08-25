'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { pageContent, withReducedMotion } from '@/lib/motion-presets';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { useMaxMd } from '@/hooks/use-max-md';
import { completeViewTransitionNavigation } from '@/lib/view-transition-navigation-state';
import { shouldUseViewTransition } from '@/lib/view-transition';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();
  const isMaxMd = useMaxMd();
  const viewTransitionEnabled = useSyncExternalStore(
    () => () => {},
    () => shouldUseViewTransition(),
    () => false,
  );

  useEffect(() => {
    completeViewTransitionNavigation();
  }, [pathname]);

  const useLightTransition = reduced || isMaxMd === true;
  const isViewportUnknown = isMaxMd === null;

  if (viewTransitionEnabled && isMaxMd === false && !reduced) {
    return (
      <div key={pathname} className="min-h-0 bb-view-transition-page">
        {children}
      </div>
    );
  }

  // Mobile / reduced motion: no pathname key or opacity-0 enter — avoids blank flashes
  // while App Router streams the next segment (e.g. bean-order detail drill-in).
  if (useLightTransition || isViewportUnknown) {
    return <div className="min-h-0">{children}</div>;
  }

  const motionPreset = withReducedMotion(pageContent, reduced);

  return (
    <AnimatePresence mode="sync" initial={false}>
      <motion.div
        key={pathname}
        initial={motionPreset.initial}
        animate={motionPreset.animate}
        exit={motionPreset.exit}
        transition={motionPreset.transition}
        className="min-h-0"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
