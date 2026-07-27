'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  BB_SELECT_LIST_CLASS,
  BB_SELECT_OPTION_CLASS,
  BB_SELECT_OPTION_SELECTED_CLASS,
  BB_SELECT_TRIGGER_CLASS,
  parseSelectOptions,
} from '@/components/ui/select-trigger-styles';
import { cn } from '@/lib/utils';

export {
  BB_SELECT_TRIGGER_CLASS,
  BB_SELECT_LIST_CLASS,
  BB_SELECT_OPTION_CLASS,
  BB_SELECT_OPTION_SELECTED_CLASS,
  parseSelectOptions,
} from '@/components/ui/select-trigger-styles';

type RoundedSelectProps = Omit<React.ComponentProps<'select'>, 'size'> & {
  wrapperClassName?: string;
};

function emitChange(
  onChange: RoundedSelectProps['onChange'] | undefined,
  name: string | undefined,
  value: string,
) {
  if (!onChange) return;
  const target = { value, name: name ?? '' } as HTMLSelectElement;
  onChange({
    target,
    currentTarget: target,
  } as React.ChangeEvent<HTMLSelectElement>);
}

export function RoundedSelect({
  className,
  wrapperClassName,
  disabled,
  children,
  value,
  defaultValue,
  onChange,
  name,
  id,
  'aria-label': ariaLabel,
  ...rest
}: RoundedSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [uncontrolled, setUncontrolled] = useState(() => String(defaultValue ?? ''));

  const options = useMemo(() => parseSelectOptions(children), [children]);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? String(value) : uncontrolled;
  const selected = options.find((opt) => opt.value === currentValue) ?? options[0];
  const displayLabel = selected?.label ?? '';

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const selectValue = (next: string) => {
    if (!isControlled) setUncontrolled(next);
    emitChange(onChange, name, next);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn('relative', wrapperClassName)}>
      {/* Keep a hidden native select for name/form semantics & progressive enhancement. */}
      <select
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        disabled={disabled}
        name={name}
        id={id ? `${id}-native` : undefined}
        value={currentValue}
        onChange={() => {}}
        {...rest}
      >
        {children}
      </select>

      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
        className={cn(BB_SELECT_TRIGGER_CLASS, 'text-left', className)}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={cn(
            'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {open && !disabled ? (
        <ul id={listId} role="listbox" className={BB_SELECT_LIST_CLASS}>
          {options.map((opt) => {
            const isSelected = opt.value === currentValue;
            return (
              <li key={opt.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={opt.disabled}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (opt.disabled) return;
                    selectValue(opt.value);
                  }}
                  className={cn(
                    BB_SELECT_OPTION_CLASS,
                    isSelected && BB_SELECT_OPTION_SELECTED_CLASS,
                  )}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
