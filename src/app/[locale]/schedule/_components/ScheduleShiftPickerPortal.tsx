'use client';

import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import type { ShiftTypeDisplay } from '@/lib/shift-type-config';
import {
  SCHEDULE_SHIFT_PICKER_BACKDROP_CLASS,
  SCHEDULE_SHIFT_PICKER_LIST_CLASS,
  SCHEDULE_SHIFT_PICKER_PANEL_CLASS,
} from '@/lib/schedule/shift-picker-layout';
import {
  useScheduleShiftPickerPlacement,
  type ScheduleShiftPickerPlacement,
} from '@/hooks/use-schedule-shift-picker-placement';
import type { Shift } from '@/types';

export type ScheduleShiftPickerAnchor = {
  employeeId: string;
  date: string;
  shift?: Shift;
  x: number;
  y: number;
};

type ScheduleShiftPickerPortalProps = {
  anchor: ScheduleShiftPickerAnchor;
  employeeName: string | undefined;
  shiftTypes: ShiftTypeDisplay[];
  isReadOnly: boolean;
  onDismiss: () => void;
  onSelect: (value: string) => void;
  onClear: () => void;
};

function panelStyle(placement: ScheduleShiftPickerPlacement): CSSProperties {
  return {
    top: `${placement.top}px`,
    left: `${placement.left}px`,
    maxHeight: placement.maxHeight > 0 ? `${placement.maxHeight}px` : undefined,
  };
}

export function ScheduleShiftPickerPortal({
  anchor,
  employeeName,
  shiftTypes,
  isReadOnly,
  onDismiss,
  onSelect,
  onClear,
}: ScheduleShiftPickerPortalProps) {
  const remeasureToken = `${Boolean(anchor.shift)}-${shiftTypes.length}`;
  const { menuRef, placement } = useScheduleShiftPickerPlacement(
    true,
    anchor.x,
    anchor.y,
    remeasureToken,
  );

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={SCHEDULE_SHIFT_PICKER_BACKDROP_CLASS}
      onClick={onDismiss}
      aria-hidden={false}
    >
      <div
        ref={menuRef}
        role="dialog"
        aria-label="เลือกกะ"
        className={SCHEDULE_SHIFT_PICKER_PANEL_CLASS}
        style={panelStyle(placement)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-border bg-muted/20 px-3 py-2.5">
          <p className="text-xs font-normal text-muted-foreground">เลือกกะ</p>
          <h2 className="truncate text-[13px] font-normal text-foreground">{employeeName}</h2>
        </div>
        <div className={SCHEDULE_SHIFT_PICKER_LIST_CLASS}>
          {shiftTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => onSelect(type.value)}
              disabled={isReadOnly}
              className={cn(
                'h-11 w-full cursor-pointer rounded-xl border px-3 text-left text-[13px] font-normal shadow-sm bb-transition hover:brightness-95 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 md:h-auto md:py-2',
                type.className,
              )}
              style={type.style}
            >
              {type.label}
            </button>
          ))}
        </div>
        {anchor.shift ? (
          <div className="shrink-0 border-t border-border bg-card p-2">
            <button
              type="button"
              onClick={onClear}
              disabled={isReadOnly}
              className="h-11 w-full cursor-pointer rounded-2xl border border-red-500/80 bg-card text-[13px] font-normal text-red-600 bb-transition hover:bg-red-50 dark:hover:bg-red-950/20 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98] md:h-auto md:py-2"
            >
              ล้างกะ
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}