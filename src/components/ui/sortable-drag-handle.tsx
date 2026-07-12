'use client';

import type { DraggableAttributes } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { useCoarsePointer } from '@/hooks/use-coarse-pointer';
import { cn } from '@/lib/utils';

export type SortableDragHandleProps = {
  attributes: DraggableAttributes;
  listeners?: Record<string, unknown>;
  setActivatorNodeRef: (element: HTMLElement | null) => void;
  disabled?: boolean;
  tip?: string;
  tipSide?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  iconClassName?: string;
  'aria-label'?: string;
};

/**
 * Touch-safe drag handle for @dnd-kit sortables.
 * - Registers activator node ref (required for reliable mobile long-press)
 * - Skips Radix tooltip wrapper on coarse pointers so touch events are not intercepted
 */
export function SortableDragHandle({
  attributes,
  listeners,
  setActivatorNodeRef,
  disabled = false,
  tip = 'ลากเพื่อเปลี่ยนลำดับ',
  tipSide = 'left',
  className,
  iconClassName = 'w-4 h-4',
  'aria-label': ariaLabel = 'ลากเพื่อเปลี่ยนลำดับ',
}: SortableDragHandleProps) {
  const coarsePointer = useCoarsePointer();

  const handle = (
    <div
      ref={setActivatorNodeRef}
      className={cn(
        'min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 touch-none select-none',
        disabled
          ? 'opacity-30 cursor-not-allowed'
          : 'cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-xl transition-colors',
        className,
      )}
      {...attributes}
      {...(disabled ? {} : listeners)}
      aria-label={ariaLabel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <GripVertical className={iconClassName} />
    </div>
  );

  if (coarsePointer || disabled || !tip) {
    return handle;
  }

  return (
    <HintTooltip tip={tip} side={tipSide}>
      {handle}
    </HintTooltip>
  );
}
