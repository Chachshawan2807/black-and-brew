'use client';

import React, { useRef, useState, useEffect } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay, isToday } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface ClickableDatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  containerClassName?: string;
  icon?: React.ReactNode;
  value?: string;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * ClickableDatePicker Component
 * Beautiful custom popover calendar designed to look premium and match
 * Black and Brew's aesthetic perfectly.
 */
export function ClickableDatePicker({
  containerClassName = '',
  icon,
  value,
  placeholder,
  onChange,
  ...props
}: ClickableDatePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  
  // Current view date of the calendar popover
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      try {
        return parseISO(value);
      } catch {
        return new Date();
      }
    }
    return new Date();
  });

  // Sync viewDate when value changes
  useEffect(() => {
    if (value) {
      try {
        setViewDate(parseISO(value));
      } catch {
        // ignore
      }
    }
  }, [value]);

  // Handle click outside to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayValue = React.useMemo(() => {
    if (value && typeof value === 'string') {
      try {
        return format(parseISO(value), 'dd/MM/yyyy');
      } catch {
        return value;
      }
    }
    return placeholder || 'เลือกวันที่';
  }, [value, placeholder]);

  // Calendar calculations
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Calculate padding days for the starting day of the week
  const startDayOfWeek = getDay(monthStart); 
  const padDays = Array.from({ length: startDayOfWeek });

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(prev => addMonths(prev, 1));
  };

  const handleSelectDay = (date: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    const dateStr = format(date, 'yyyy-MM-dd');
    if (onChange) {
      onChange({
        target: { value: dateStr }
      } as React.ChangeEvent<HTMLInputElement>);
    }
    setIsOpen(false);
  };

  const selectedDate = value ? parseISO(value) : null;
  const dayLabels = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  return (
    <div ref={containerRef} className="relative z-30 flex-1">
      {/* Capsule trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex items-center justify-center gap-1.5 h-11 px-4 text-xs font-normal text-black bg-white hover:bg-gray-100 rounded-3xl border border-gray-200 transition-all duration-200 active:scale-95 cursor-pointer uppercase tracking-wide shadow-sm w-full ${containerClassName}`}
      >
        {icon || <CalendarIcon className="w-4 h-4 text-black" />}
        <span>{displayValue}</span>
      </button>

      {/* Modern Popover Calendar */}
      {isOpen && (
        <>
          {/* Mobile Overlay */}
          <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm md:hidden" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
          
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[320px] md:absolute md:top-auto md:left-auto md:right-0 md:translate-x-0 md:translate-y-0 md:mt-2 md:w-72 bg-[#fdfcf0] rounded-3xl border border-black/5 shadow-2xl p-5 md:p-4 animate-in fade-in zoom-in-95 md:slide-in-from-top-2 duration-200 z-[110] md:z-50">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-black/5 rounded-full text-black transition-colors cursor-pointer flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[13px] font-normal text-black uppercase tracking-wider">
                {format(viewDate, 'MMMM yyyy')}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-black/5 rounded-full text-black transition-colors cursor-pointer flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday labels */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {dayLabels.map((lbl, idx) => (
                <span key={idx} className={`text-[10px] font-normal tracking-wider ${idx === 0 ? 'text-red-500' : 'text-gray-400'}`}>
                  {lbl}
                </span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {padDays.map((_, idx) => (
                <div key={`pad-${idx}`} className="aspect-square" />
              ))}
              {daysInMonth.map((day) => {
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const isCurrent = isToday(day);
                return (
                  <button
                    key={day.toString()}
                    type="button"
                    onClick={(e) => handleSelectDay(day, e)}
                    className={`aspect-square rounded-xl text-[12px] font-normal flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-black text-white shadow-md'
                        : isCurrent
                        ? 'bg-[#ffda66] text-black'
                        : 'hover:bg-black/5 text-black'
                    }`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
