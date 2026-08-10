import { Children, isValidElement, type ReactNode } from 'react';

/** Native select trigger — aligned with ClickableDatePicker pill surface. */
export const BB_SELECT_TRIGGER_CLASS =
  'relative h-11 w-full appearance-none rounded-3xl border border-border bg-card px-4 pr-10 text-sm font-normal text-foreground bb-shadow-sm transition-all duration-200 hover:bg-muted/50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 disabled:cursor-not-allowed disabled:opacity-60';

/** Open listbox panel — theme tokens so dark mode stays readable. */
export const BB_SELECT_LIST_BASE_CLASS =
  'overflow-y-auto rounded-2xl border border-border bg-card p-1.5 text-foreground bb-shadow-lg';

/** In-flow listbox (legacy); prefer portaled list in RoundedSelect. */
export const BB_SELECT_LIST_CLASS =
  `absolute z-50 mt-1.5 max-h-60 w-full min-w-[10rem] ${BB_SELECT_LIST_BASE_CLASS}`;

/** Individual option row — rounded, no OS-blue highlight. */
export const BB_SELECT_OPTION_CLASS =
  'flex w-full cursor-pointer items-center rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 disabled:cursor-not-allowed disabled:opacity-50';

export const BB_SELECT_OPTION_SELECTED_CLASS = 'bg-muted text-foreground';

export type SelectOptionItem = {
  value: string;
  label: string;
  disabled: boolean;
};

export function parseSelectOptions(children: ReactNode): SelectOptionItem[] {
  const items: SelectOptionItem[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type !== 'option') return;

    const props = child.props as {
      value?: string | number;
      disabled?: boolean;
      children?: ReactNode;
    };

    const label =
      typeof props.children === 'string' || typeof props.children === 'number'
        ? String(props.children)
        : Children.toArray(props.children)
            .map((node) => (typeof node === 'string' || typeof node === 'number' ? String(node) : ''))
            .join('');

    items.push({
      value: props.value !== undefined ? String(props.value) : label,
      label,
      disabled: Boolean(props.disabled),
    });
  });

  return items;
}
