'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fadeOverlay, modalContent, withReducedMotion } from '@/lib/motion-presets';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';

type FadeModalScaffoldProps = {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  zIndex?: number;
  overlayClassName?: string;
  panelClassName?: string;
  layoutClassName?: string;
  panelOnClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  'aria-label'?: string;
};

export function FadeModalScaffold({
  open,
  onClose,
  children,
  zIndex = 50,
  overlayClassName,
  panelClassName,
  layoutClassName,
  panelOnClick,
  'aria-label': ariaLabel,
}: FadeModalScaffoldProps) {
  const reduced = usePrefersReducedMotion();
  const overlay = withReducedMotion(fadeOverlay, reduced);
  const panel = withReducedMotion(modalContent, reduced);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="fade-modal-backdrop"
            className={cn(
              'fixed inset-0',
              overlayClassName ?? 'bg-black/20 backdrop-blur-sm',
            )}
            style={{ zIndex }}
            initial={overlay.initial}
            animate={overlay.animate}
            exit={overlay.exit}
            transition={overlay.transition}
            onClick={onClose}
            aria-hidden
          />
          <div
            className={cn(
              'fixed inset-0 flex pointer-events-none',
              layoutClassName ?? 'items-end justify-center md:items-center p-0 md:p-4',
            )}
            style={{ zIndex: zIndex + 1 }}
          >
            <motion.div
              key="fade-modal-panel"
              className={cn('pointer-events-auto', panelClassName)}
              initial={panel.initial}
              animate={panel.animate}
              exit={panel.exit}
              transition={panel.transition}
              onClick={panelOnClick}
              role="dialog"
              aria-label={ariaLabel}
              aria-modal="true"
            >
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
