'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FAB_RIGHT_CLASS } from '@/lib/floating-action-layout';
import { fabTrigger } from '@/lib/motion-presets';

type FabFadePresenceProps = {
  visible: boolean;
  presenceKey: string;
  className?: string;
  children: React.ReactNode;
};

export function FabFadePresence({
  visible,
  presenceKey,
  className,
  children,
}: FabFadePresenceProps) {
  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key={presenceKey}
          className={cn('fixed flex items-center justify-center', FAB_RIGHT_CLASS, className)}
          initial={fabTrigger.initial}
          animate={fabTrigger.animate}
          exit={fabTrigger.exit}
          transition={fabTrigger.transition}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
