'use client';

import { ChevronDown } from 'lucide-react';
import { BEAN_ORDER_SELECT } from './bean-order-layout';
import { cn } from '@/lib/utils';

type Props = React.ComponentProps<'select'> & {
  wrapperClassName?: string;
};

export function BeanOrderSelect({ className, wrapperClassName, ...props }: Props) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <select className={cn(BEAN_ORDER_SELECT, className)} {...props} />
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  );
}
