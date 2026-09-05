'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { fadeOverlay, modalContent, withReducedMotion } from '@/lib/motion-presets';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { EXPORT_PROGRESS_OVERLAY_Z_CLASS } from '@/lib/floating-action-layout';
import { LoadingIcon } from '@/components/ui/loading-icon';
import { ImageDown } from '@/lib/icons';
import { ModalPortal } from '@/components/ui/modal-portal';
import { cn } from '@/lib/utils';

type ExportProgressOverlayProps = {
  visible: boolean;
  title?: string;
  subtitle?: string;
};

export function ExportProgressOverlay({
  visible,
  title = 'กำลังบันทึกรูปภาพ',
  subtitle = 'กรุณารอสักครู่...',
}: ExportProgressOverlayProps) {
  const reduced = usePrefersReducedMotion();
  const overlay = withReducedMotion(fadeOverlay, reduced);
  const panel = withReducedMotion(modalContent, reduced);

  return (
    <ModalPortal>
      <AnimatePresence>
        {visible && (
          <motion.div
            role="status"
            aria-live="polite"
            aria-busy="true"
            initial={overlay.initial}
            animate={overlay.animate}
            exit={overlay.exit}
            transition={overlay.transition}
            className={cn(
              EXPORT_PROGRESS_OVERLAY_Z_CLASS,
              'bb-export-progress-overlay fixed inset-0 flex items-center justify-center',
              'min-h-[100dvh] px-[max(1.5rem,env(safe-area-inset-left,0px))]',
              'pt-[max(1.5rem,env(safe-area-inset-top,0px))]',
              'pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]',
              'pr-[max(1.5rem,env(safe-area-inset-right,0px))]',
            )}
          >
            <div className="absolute inset-0 bg-black/45 backdrop-blur-md" aria-hidden="true" />

            <motion.div
              initial={panel.initial}
              animate={panel.animate}
              exit={panel.exit}
              transition={panel.transition}
              className="bb-export-progress-card relative w-full max-w-[min(300px,calc(100vw-2rem))] rounded-[28px] border border-border bg-card px-7 py-8 bb-shadow-xl backdrop-blur-xl"
            >
              <div className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center">
                {!reduced ? (
                  <>
                    <motion.div
                      className="absolute h-[72px] w-[72px] rounded-[22px] border border-border bg-muted/50"
                      animate={{ scale: [1, 1.05, 1], opacity: [0.55, 0.9, 0.55] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.div
                      className="absolute h-[56px] w-[56px] rounded-[18px] border border-border bg-card bb-shadow-sm"
                      animate={{ y: [0, -2, 0] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </>
                ) : (
                  <div className="absolute h-[56px] w-[56px] rounded-[18px] border border-border bg-card bb-shadow-sm" />
                )}
                <motion.div
                  className="relative flex h-[44px] w-[44px] items-center justify-center rounded-2xl bg-foreground text-background bb-shadow-md"
                  animate={reduced ? undefined : { y: [0, -1, 0] }}
                  transition={{ duration: 2.2, repeat: reduced ? 0 : Infinity, ease: 'easeInOut', delay: 0.08 }}
                >
                  <LoadingIcon size="md" className="text-background" />
                  <ImageDown
                    className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-card p-0.5 text-foreground"
                    strokeWidth={1.75}
                  />
                </motion.div>
              </div>

              <div className="space-y-1.5 text-center">
                <p className="text-[15px] font-normal tracking-tight text-foreground">{title}</p>
                <p className="text-[12px] font-normal text-muted-foreground">{subtitle}</p>
              </div>

              <div className="mt-6 h-1 overflow-hidden rounded-full bg-muted">
                {!reduced ? (
                  <motion.div
                    className="h-full w-[38%] rounded-full bg-gradient-to-r from-transparent via-foreground/25 to-transparent"
                    animate={{ x: ['-120%', '320%'] }}
                    transition={{ duration: 1.35, repeat: Infinity, ease: 'easeInOut' }}
                  />
                ) : (
                  <div className="h-full w-2/5 rounded-full bg-foreground/20" />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
}
