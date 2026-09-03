'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from '@/lib/icons';
import {
  BB_SELECT_LIST_BASE_CLASS,
  BB_SELECT_OPTION_CLASS,
  BB_SELECT_OPTION_SELECTED_CLASS,
  BB_SELECT_TRIGGER_CLASS,
  parseSelectOptions,
} from '@/components/ui/select-trigger-styles';
import { SELECT_LISTBOX_Z_CLASS } from '@/lib/floating-action-layout';
import { getAnchoredSuggestionsOverlayStyle } from '@/lib/quick-search-suggestions-layout';
import { bindPointerSafeOptionSelect } from '@/lib/pointer-overlay-selection';
import { cn } from '@/lib/utils';

export {
  BB_SELECT_TRIGGER_CLASS,
  BB_SELECT_LIST_BASE_CLASS,
  BB_SELECT_OPTION_CLASS,
  BB_SELECT_OPTION_SELECTED_CLASS,
  parseSelectOptions,
} from '@/components/ui/select-trigger-styles';

type RoundedSelectProps = Omit<React.ComponentProps<'select'>, 'size'> & {
  wrapperClassName?: string;
};

const LISTBOX_GAP_PX = 6;
const LISTBOX_MAX_HEIGHT_PX = 240;

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
  const autoFieldId = useId();
  const resolvedId = id ?? autoFieldId;
  const resolvedName = name ?? `bb-select-${resolvedId.replace(/:/g, '')}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const isMounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [listStyle, setListStyle] = useState<CSSProperties>({});
  const [uncontrolled, setUncontrolled] = useState(() => String(defaultValue ?? ''));

  const options = useMemo(() => parseSelectOptions(children), [children]);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? String(value) : uncontrolled;
  const selected = options.find((opt) => opt.value === currentValue) ?? options[0];
  const displayLabel = selected?.label ?? '';

  const updateListPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const vv = window.visualViewport;
    const anchored = getAnchoredSuggestionsOverlayStyle(
      rect,
      {
        offsetTop: vv?.offsetTop ?? 0,
        offsetLeft: vv?.offsetLeft ?? 0,
        visibleHeight: vv?.height ?? window.innerHeight,
        visibleWidth: vv?.width ?? window.innerWidth,
      },
      LISTBOX_GAP_PX,
    );

    setListStyle({
      position: 'fixed',
      left: anchored.left,
      width: anchored.width,
      maxWidth: anchored.maxWidth,
      top: anchored.top,
      bottom: anchored.bottom,
      maxHeight: Math.min(anchored.maxHeight, LISTBOX_MAX_HEIGHT_PX),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateListPosition();
  }, [open, updateListPosition]);

  useEffect(() => {
    if (!open) return;

    const vv = window.visualViewport;
    vv?.addEventListener('resize', updateListPosition, { passive: true });
    vv?.addEventListener('scroll', updateListPosition, { passive: true });
    window.addEventListener('resize', updateListPosition, { passive: true });
    window.addEventListener('scroll', updateListPosition, { passive: true, capture: true });

    return () => {
      vv?.removeEventListener('resize', updateListPosition);
      vv?.removeEventListener('scroll', updateListPosition);
      window.removeEventListener('resize', updateListPosition);
      window.removeEventListener('scroll', updateListPosition, true);
    };
  }, [open, updateListPosition]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        target &&
        (rootRef.current?.contains(target) ||
          listRef.current?.contains(target))
      ) {
        return;
      }
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
    emitChange(onChange, resolvedName, next);
    setOpen(false);
  };

  const listbox = open && !disabled ? (
    <ul
      ref={listRef}
      id={listId}
      role="listbox"
      className={cn(
        BB_SELECT_LIST_BASE_CLASS,
        'fixed min-w-[10rem] bb-smooth-scroll overscroll-y-contain',
        SELECT_LISTBOX_Z_CLASS,
      )}
      style={listStyle}
    >
      {options.map((opt) => {
        const isSelected = opt.value === currentValue;
        return (
          <li key={opt.value} role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={isSelected}
              disabled={opt.disabled}
              className={cn(
                BB_SELECT_OPTION_CLASS,
                'touch-manipulation',
                isSelected && BB_SELECT_OPTION_SELECTED_CLASS,
              )}
              {...bindPointerSafeOptionSelect(() => {
                if (opt.disabled) return;
                selectValue(opt.value);
              })}
            >
              {opt.label}
            </button>
          </li>
        );
      })}
    </ul>
  ) : null;

  return (
    <div ref={rootRef} className={cn('relative', wrapperClassName)}>
      {/* Keep a hidden native select for name/form semantics & progressive enhancement. */}
      <select
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        disabled={disabled}
        name={resolvedName}
        id={`${resolvedId}-native`}
        value={currentValue}
        onChange={() => {}}
        {...rest}
      >
        {children}
      </select>

      <button
        ref={triggerRef}
        type="button"
        id={resolvedId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onClick={() => {
          if (disabled) return;
          if (!open) updateListPosition();
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

      {isMounted && listbox ? createPortal(listbox, document.body) : null}
    </div>
  );
}
