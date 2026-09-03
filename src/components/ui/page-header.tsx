import type { ReactNode } from 'react';
import { shouldShowPageTitle } from '@/lib/sidebar-menu-labels';
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
  const showTitle = shouldShowPageTitle(title);

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
        {showTitle ? (
          <h1 className={cn(TITLE_SIZE_CLASS[size], titleClassName)}>{title}</h1>
        ) : null}
        {subtitle ? <p className="bb-page-subtitle">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}
