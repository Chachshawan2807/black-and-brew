'use client';

import React, { useRef } from 'react';
import { format, parseISO } from 'date-fns';

interface ClickableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  type: 'date' | 'time' | 'datetime-local';
  containerClassName?: string;
  icon?: React.ReactNode;
}

/**
 * ClickableInput Component
 * Standardizes date/time inputs to be full-width clickable according to UI-UX-PRO-MAX accessibility rules.
 * Now supports Thai Standard Date Format (DD/MM/YYYY).
 */
export function ClickableInput({ 
  type,
  containerClassName = '', 
  icon, 
  value,
  ...props 
}: ClickableInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleContainerClick = () => {
    if (inputRef.current) {
      if ('showPicker' in HTMLInputElement.prototype) {
        try {
          inputRef.current.showPicker();
        } catch {
          inputRef.current.focus();
        }
      } else {
        inputRef.current.focus();
        inputRef.current.click();
      }
    }
  };

  const displayValue = React.useMemo(() => {
    if (type === 'date' && value && typeof value === 'string') {
      try {
        return format(parseISO(value), 'dd/MM/yyyy');
      } catch {
        return value;
      }
    }
    return '';
  }, [type, value]);

  return (
    <div 
      onClick={handleContainerClick}
      className={`group relative flex items-center gap-2 bg-white rounded-xl p-1.5 border border-gray-200 cursor-pointer shadow-sm hover:border-gray-300 transition-colors ${containerClassName}`}
    >
      {icon && <div className="shrink-0 pointer-events-none">{icon}</div>}
      
      <div className="flex-1 flex items-center justify-center min-w-0">
        <span className="text-[14px] font-normal text-[#000000] text-center block w-full truncate">
          {type === 'date' && value ? displayValue : (type === 'date' ? 'YYYY-MM-DD' : value?.toString() || '')}
        </span>
        <input
          ref={inputRef}
          type={type}
          value={value}
          className="sr-only"
          onClick={(e) => e.stopPropagation()} 
          {...props}
        />
      </div>
    </div>
  );
}
