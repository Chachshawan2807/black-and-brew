'use client';

import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { pageContent, withReducedMotion } from '@/lib/motion-presets';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = usePrefersReducedMotion();
  const motionPreset = withReducedMotion(pageContent, reduced);

  return (
    <AnimatePresence mode="wait" initial={false}>
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
