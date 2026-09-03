import { shouldShowPageTitle } from '@/lib/sidebar-menu-labels';
import { cn } from '@/lib/utils';

type PageTitleProps = {
  children: string;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
};

/** Page heading that omits text duplicated in the sidebar navigation. */
export function PageTitle({ children, as: Tag = 'h1', className }: PageTitleProps) {
  if (!shouldShowPageTitle(children)) return null;
  return <Tag className={cn(className)}>{children}</Tag>;
}
