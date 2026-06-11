'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ImageDown } from 'lucide-react';

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
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          aria-busy="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-6"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="relative w-full max-w-[300px] rounded-[28px] border border-border bg-card px-7 py-8 shadow-[0_20px_60px_rgb(0,0,0,0.24)] backdrop-blur-xl"
          >
            <div className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center">
              <motion.div
                className="absolute h-[72px] w-[72px] rounded-[22px] border border-border bg-muted/50"
                animate={{ scale: [1, 1.05, 1], opacity: [0.55, 0.9, 0.55] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="absolute h-[56px] w-[56px] rounded-[18px] border border-border bg-card shadow-sm"
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                className="relative flex h-[44px] w-[44px] items-center justify-center rounded-2xl bg-foreground text-background shadow-md"
                animate={{ y: [0, -1, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.08 }}
              >
                <ImageDown className="h-5 w-5" strokeWidth={1.75} />
              </motion.div>
            </div>

            <div className="space-y-1.5 text-center">
              <p className="text-[15px] font-normal tracking-tight text-foreground">{title}</p>
              <p className="text-[12px] font-normal text-muted-foreground">{subtitle}</p>
            </div>

            <div className="mt-6 h-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full w-[38%] rounded-full bg-gradient-to-r from-transparent via-foreground/25 to-transparent"
                animate={{ x: ['-120%', '320%'] }}
                transition={{ duration: 1.35, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
