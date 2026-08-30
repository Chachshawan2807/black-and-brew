'use client';

import * as React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCoarsePointer } from '@/hooks/use-coarse-pointer';

export type HintTooltipProps = {
  tip: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  children: React.ReactElement;
  /** When true, renders children without a tooltip */
  disabled?: boolean;
};

/**
 * Short styled hover/focus hint for icon buttons and compact controls.
 * Skips native `title` pass copy via `tip` only.
 * On touch-first devices, renders children directly so Radix tooltip does not intercept taps.
 */
export function HintTooltip({
  tip,
  side = 'top',
  align = 'center',
  children,
  disabled = false,
}: HintTooltipProps) {
  const coarsePointer = useCoarsePointer();

  if (disabled || !tip || coarsePointer) return children;

  const child = React.Children.only(children);
  const isChildDisabled =
    React.isValidElement(child) &&
    Boolean((child.props as { disabled?: boolean }).disabled);

  const trigger = isChildDisabled ? (
    <span className="inline-flex">{child}</span>
  ) : (
    child
  );

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent side={side} align={align}>
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}
