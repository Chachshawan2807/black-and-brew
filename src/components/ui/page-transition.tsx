'use client';

import { useEffect, useState } from 'react';
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
  const [viewTransitionEnabled, setViewTransitionEnabled] = useState(false);

  useEffect(() => {
    setViewTransitionEnabled(shouldUseViewTransition());
  }, []);

  useEffect(() => {
    completeViewTransitionNavigation();
  }, [pathname]);

  if (viewTransitionEnabled) {
    return (
      <div key={pathname} className="min-h-0 bb-view-transition-page">
        {children}
      </div>
    );
  }

  const useLightTransition = reduced || isMaxMd !== false;

  if (useLightTransition) {
    return (
      <div key={pathname} className="min-h-0 animate-page-enter motion-reduce:animate-none">
        {children}
      </div>
    );
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
