'use client';

import React, { useRef } from 'react';
import { format, parseISO } from 'date-fns';

interface ClickableDatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
  icon?: React.ReactNode;
}

/**
 * ClickableDatePicker Component
 * Created specifically to handle Date Picker Accessibility rules.
 * Now supports Thai Standard Date Format (DD/MM/YYYY).
 */
export function ClickableDatePicker({ 
  containerClassName = '', 
  icon, 
  className = '', 
  value,
  ...props 
}: ClickableDatePickerProps) {
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
    if (value && typeof value === 'string') {
      try {
        return format(parseISO(value), 'dd/MM/yyyy');
      } catch {
        return value;
      }
    }
    return '';
  }, [value]);

  return (
    <div 
      onClick={handleContainerClick}
      className={`group relative flex items-center gap-2 bg-white rounded-xl p-1.5 border border-gray-200 cursor-pointer shadow-sm hover:border-gray-300 transition-colors ${containerClassName}`}
    >
      {icon && <div className="shrink-0 pointer-events-none">{icon}</div>}
      
      <div className="flex-1 relative h-full flex items-center">
        {value && (
          <div className="absolute inset-0 flex items-center text-[14px] text-[#000000] pointer-events-none z-10 bg-white">
            {displayValue}
          </div>
        )}
        <input
          ref={inputRef}
          type="date"
          value={value}
          className={`w-full h-full bg-transparent text-[14px] text-[#000000] border-none outline-none focus:ring-0 cursor-pointer appearance-none ${className} ${value ? 'opacity-0' : 'opacity-100'}`}
          onClick={(e) => e.stopPropagation()} 
          {...props}
        />
      </div>
      
      <div className="absolute inset-0 z-0" />
    </div>
  );
}
