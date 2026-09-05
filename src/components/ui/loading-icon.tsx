import type { LucideProps } from '@/lib/icons';
import { ICON_STROKE, Loader2 } from '@/lib/icons';
import { cn } from '@/lib/utils';

export const LOADING_ICON_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export type LoadingIconSize = keyof typeof LOADING_ICON_SIZE;

type LoadingIconProps = Omit<LucideProps, 'size'> & {
  /** Token (`md`, `lg`, …) or explicit pixel size. */
  size?: LoadingIconSize | number;
};

/** Standardized spinner for buttons, modals, panels, and full-page loading states. */
export function LoadingIcon({
  size = 'md',
  strokeWidth = ICON_STROKE,
  className,
  ...props
}: LoadingIconProps) {
  const pixelSize = typeof size === 'number' ? size : LOADING_ICON_SIZE[size];

  return (
    <Loader2
      size={pixelSize}
      strokeWidth={strokeWidth}
      className={cn('shrink-0 animate-spin motion-reduce:animate-none', className)}
      aria-hidden
      {...props}
    />
  );
}
