'use client';

import { RoundedSelect } from '@/components/ui/rounded-select';

type Props = React.ComponentProps<'select'> & {
  wrapperClassName?: string;
};

/** Bean-orders select shared rounded trigger styling. */
export function BeanOrderSelect(props: Props) {
  return <RoundedSelect {...props} />;
}
