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
  className = '', 
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
      
      <div className="flex-1 relative h-full flex items-center">
        {type === 'date' && value && (
          <div className="absolute inset-0 flex items-center text-[14px] text-[#000000] pointer-events-none z-10 bg-white">
            {displayValue}
          </div>
        )}
        <input
          ref={inputRef}
          type={type}
          value={value}
          className={`w-full h-full bg-transparent text-[14px] text-[#000000] border-none outline-none focus:ring-0 cursor-pointer appearance-none ${className} ${type === 'date' && value ? 'opacity-0' : 'opacity-100'}`}
          onClick={(e) => e.stopPropagation()} 
          {...props}
        />
      </div>
      
      <div className="absolute inset-0 z-0" />
    </div>
  );
}
