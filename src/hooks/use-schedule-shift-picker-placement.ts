'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import {
  getScheduleShiftPickerMaxHeight,
  getScheduleShiftPickerPosition,
} from '@/lib/schedule/shift-picker-position';

export type ScheduleShiftPickerPlacement = {
  left: number;
  top: number;
  maxHeight: number;
};

/**
 * Keeps the portaled shift picker inside the viewport. Re-measures when the
 * menu height changes (e.g. ล้างกะ footer or shift type count).
 */
export function useScheduleShiftPickerPlacement(
  open: boolean,
  anchorX: number,
  anchorY: number,
  remeasureToken: string | number,
) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<ScheduleShiftPickerPlacement>({
    left: 0,
    top: 0,
    maxHeight: 0,
  });

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const menuHeight = menuRef.current?.offsetHeight || 300;
      const menuWidth = menuRef.current?.offsetWidth || 192;

      const { left, top } = getScheduleShiftPickerPosition(
        anchorX,
        anchorY,
        menuWidth,
        menuHeight,
      );
      setPlacement({
        left,
        top,
        maxHeight: getScheduleShiftPickerMaxHeight(top),
      });
    };

    updatePosition();

    const menuEl = menuRef.current;
    let resizeObserver: ResizeObserver | null = null;
    if (menuEl && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updatePosition());
      resizeObserver.observe(menuEl);
    }

    const vv = window.visualViewport;
    vv?.addEventListener('resize', updatePosition);
    vv?.addEventListener('scroll', updatePosition);

    window.addEventListener('resize', updatePosition, { passive: true });
    window.addEventListener('scroll', updatePosition, { passive: true, capture: true });

    return () => {
      resizeObserver?.disconnect();
      vv?.removeEventListener('resize', updatePosition);
      vv?.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, anchorX, anchorY, remeasureToken]);

  return { menuRef, placement };
}