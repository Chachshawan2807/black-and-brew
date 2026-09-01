import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  children: ReactNode;
  className?: string;
};

export function EmptyState({ children, className }: EmptyStateProps) {
  return <div className={cn('bb-empty-state', className)}>{children}</div>;
}
