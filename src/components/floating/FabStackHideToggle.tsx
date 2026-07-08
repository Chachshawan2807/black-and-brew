'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  FAB_BOTTOM_HIDE_TOGGLE_CLASS,
  FAB_HIDE_TOGGLE_SIZE_CLASS,
  FAB_RIGHT_CLASS,
} from '@/lib/floating-action-layout';
import { useFloatingOverlay } from '@/components/floating/FloatingOverlayContext';
import { HintTooltip } from '@/components/ui/hint-tooltip';

export function FabStackHideToggle() {
  const { fabStackHidden, fabStackSuppressed, toggleFabStackHidden } = useFloatingOverlay();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional client-only mount gate
    setIsMounted(true);
  }, []);

  if (!isMounted || fabStackSuppressed) return null;

  return (
    <HintTooltip
      tip={fabStackHidden ? 'แสดงปุ่มลัด' : 'ซ่อนปุ่มลัด'}
      side="left"
    >
      <motion.button
        type="button"
        onClick={toggleFabStackHidden}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        aria-label={fabStackHidden ? 'แสดงปุ่มลัด' : 'ซ่อนปุ่มลัด'}
        aria-pressed={fabStackHidden}
        className={cn(
          'fixed z-[199] flex items-center justify-center rounded-full bb-transition',
          FAB_HIDE_TOGGLE_SIZE_CLASS,
          FAB_RIGHT_CLASS,
          FAB_BOTTOM_HIDE_TOGGLE_CLASS,
          'bg-white/10 dark:bg-white/8',
          'backdrop-blur-sm',
          'border border-white/25 dark:border-white/20',
          'ring-1 ring-black/10 dark:ring-white/15',
          'bb-shadow-sm',
        )}
      >
        {fabStackHidden ? (
          <Plus
            size={15}
            strokeWidth={2.5}
            aria-hidden
            className="text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.95),0_1px_4px_rgba(0,0,0,0.75)]"
          />
        ) : (
          <Minus
            size={15}
            strokeWidth={2.5}
            aria-hidden
            className="text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.95),0_1px_4px_rgba(0,0,0,0.75)]"
          />
        )}
      </motion.button>
    </HintTooltip>
  );
}
