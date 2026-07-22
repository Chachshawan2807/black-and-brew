'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toastSlide, alertSlideIn } from '@/lib/motion-presets';
import { getAnchoredFloatingPosition } from '@/lib/floating-position';

type FloatingAlertProps = {
  message: string;
  duration?: number;
  onDismiss?: () => void;
  className?: string;
  style?: React.CSSProperties;
  icon?: React.ReactNode;
  /** Viewport coordinates (e.g. click clientX/clientY) — positions alert above anchor, clamped to screen. */
  anchor?: { x: number; y: number };
};

export function FloatingAlert({
  message,
  duration = 2800,
  onDismiss,
  className,
  style,
  icon,
  anchor,
}: FloatingAlertProps) {
  const [visible, setVisible] = useState(true);
  const alertRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional client-only mount gate
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!anchor || !alertRef.current) return;
    const { width, height } = alertRef.current.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    setPosition(getAnchoredFloatingPosition(anchor.x, anchor.y, width, height));
  }, [anchor]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition, message]);

  useEffect(() => {
    if (!anchor) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.visualViewport?.addEventListener('resize', updatePosition);
    window.visualViewport?.addEventListener('scroll', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.visualViewport?.removeEventListener('resize', updatePosition);
      window.visualViewport?.removeEventListener('scroll', updatePosition);
    };
  }, [anchor, updatePosition]);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration, message]);

  const resolvedStyle: React.CSSProperties = anchor
    ? {
        ...(position
          ? { top: position.top, left: position.left }
          : { top: anchor.y, left: anchor.x, visibility: 'hidden' as const }),
      }
    : (style ?? {});

  const alert = (
    <AnimatePresence onExitComplete={onDismiss}>
      {visible && (
        <motion.div
          ref={alertRef}
          initial={toastSlide.initial}
          animate={toastSlide.animate}
          exit={toastSlide.exit}
          transition={toastSlide.transition}
          className={cn('fixed z-[200] pointer-events-none', className)}
          style={resolvedStyle}
        >
          <div className="bg-card border border-border bb-shadow-lg rounded-3xl py-2.5 px-5 flex items-center gap-3 max-w-[min(calc(100vw-24px),28rem)]">
            {icon ?? <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse shrink-0" />}
            <p className="text-[13px] font-normal text-foreground tracking-tight text-pretty">
              {message}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (anchor && mounted && typeof document !== 'undefined') {
    return createPortal(alert, document.body);
  }

  return alert;
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
          {...alertSlideIn}
          transition={alertSlideIn.transition}
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
