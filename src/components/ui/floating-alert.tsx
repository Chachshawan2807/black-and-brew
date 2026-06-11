'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toastSlide } from '@/lib/motion-presets';

type FloatingAlertProps = {
  message: string;
  duration?: number;
  onDismiss?: () => void;
  className?: string;
  style?: React.CSSProperties;
  icon?: React.ReactNode;
};

export function FloatingAlert({
  message,
  duration = 2800,
  onDismiss,
  className,
  style,
  icon,
}: FloatingAlertProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration, message]);

  return (
    <AnimatePresence onExitComplete={onDismiss}>
      {visible && (
        <motion.div
          initial={toastSlide.initial}
          animate={toastSlide.animate}
          exit={toastSlide.exit}
          transition={toastSlide.transition}
          className={cn('fixed z-[200] pointer-events-none', className)}
          style={style}
        >
          <div className="bg-card border border-border bb-shadow-md rounded-3xl py-2.5 px-5 flex items-center gap-3">
            {icon ?? <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />}
            <p className="text-[13px] font-normal text-foreground tracking-tight whitespace-nowrap">
              {message}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type FloatingToastProps = {
  message: string;
  type?: 'success' | 'error';
  duration?: number;
  onDismiss?: () => void;
  className?: string;
};

export function FloatingToast({
  message,
  type = 'success',
  duration = 3000,
  onDismiss,
  className,
}: FloatingToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration, message]);

  return (
    <AnimatePresence onExitComplete={onDismiss}>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={cn(
            'fixed bottom-8 right-8 z-[200] px-6 py-4 rounded-3xl bb-shadow-lg border flex items-center gap-3 font-normal',
            type === 'success'
              ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
              : 'bg-red-50 border-red-100 text-red-700',
            className
          )}
        >
          {type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
