'use client';

import { useId, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { BEAN_ORDER_BTN_LIST } from './bean-order-layout';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  suggestions: string[];
  inputClass: string;
  placeholder?: string;
  required?: boolean;
  inputMode?: 'text' | 'numeric' | 'tel' | 'decimal';
  autoComplete?: string;
  maxLength?: number;
  multiline?: boolean;
};

export function AutocompleteTextField({
  value,
  onChange,
  onSelect,
  suggestions,
  inputClass,
  placeholder,
  required,
  inputMode,
  autoComplete,
  maxLength,
  multiline = false,
}: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const visibleSuggestions = useMemo(() => suggestions.slice(0, 12), [suggestions]);

  function handleSelect(next: string) {
    onChange(next);
    onSelect?.(next);
    setOpen(false);
  }

  const fieldProps = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(e.target.value);
      setOpen(true);
    },
    onFocus: () => setOpen(true),
    onBlur: () => {
      window.setTimeout(() => setOpen(false), 120);
    },
    placeholder,
    required,
    inputMode,
    autoComplete,
    maxLength,
    className: inputClass,
  };

  return (
    <div className="relative">
      {multiline ? (
        <textarea {...fieldProps} className={cn(inputClass, 'h-20 py-2')} />
      ) : (
        <input {...fieldProps} />
      )}
      {open && visibleSuggestions.length > 0 && (
        <ul
          id={listId}
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-sm"
          role="listbox"
        >
          {visibleSuggestions.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                className={BEAN_ORDER_BTN_LIST}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(suggestion)}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
