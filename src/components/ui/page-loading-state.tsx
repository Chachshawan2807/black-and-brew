import type { ReactNode } from 'react';
import { LoadingIcon, type LoadingIconSize } from '@/components/ui/loading-icon';
import { cn } from '@/lib/utils';

type PageLoadingStateProps = {
  label: string;
  size?: LoadingIconSize;
  className?: string;
  children?: ReactNode;
};

/** Full-page or section loading placeholder with consistent spinner and label. */
export function PageLoadingState({
  label,
  size = 'xl',
  className,
  children,
}: PageLoadingStateProps) {
  return (
    <div
      className={cn(
        'flex h-full flex-col items-center justify-center bg-transparent text-foreground',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LoadingIcon size={size} className="mb-4 text-foreground" />
      <span className="text-sm font-normal uppercase tracking-widest text-foreground">{label}</span>
      {children}
    </div>
  );
}
