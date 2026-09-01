import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageHeaderSize = 'compact' | 'default' | 'large';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  size?: PageHeaderSize;
  className?: string;
  titleClassName?: string;
  actions?: ReactNode;
};

const TITLE_SIZE_CLASS: Record<PageHeaderSize, string> = {
  compact: 'bb-page-title-compact',
  default: 'bb-page-title',
  large: 'bb-page-title-lg',
};

export function PageHeader({
  title,
  subtitle,
  size = 'default',
  className,
  titleClassName,
  actions,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        actions
          ? 'flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'
          : undefined,
        className,
      )}
    >
      <div>
        <h1 className={cn(TITLE_SIZE_CLASS[size], titleClassName)}>{title}</h1>
        {subtitle ? <p className="bb-page-subtitle">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}
