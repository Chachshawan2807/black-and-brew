import type { LucideProps } from '@/lib/icons';
import { ICON_STROKE, X } from '@/lib/icons';
import { cn } from '@/lib/utils';

export const CLOSE_ICON_SIZE = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
} as const;

export type CloseIconSize = keyof typeof CLOSE_ICON_SIZE;

type CloseIconProps = Omit<LucideProps, 'size'> & {
  size?: CloseIconSize;
};

/** Standardized close icon for modal headers, overlays, and dismiss controls. */
export function CloseIcon({
  size = 'md',
  strokeWidth = ICON_STROKE,
  className,
  ...props
}: CloseIconProps) {
  return (
    <X
      size={CLOSE_ICON_SIZE[size]}
      strokeWidth={strokeWidth}
      className={cn('shrink-0', className)}
      aria-hidden
      {...props}
    />
  );
}
