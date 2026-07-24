'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { fadeOverlay, withReducedMotion } from '@/lib/motion-presets';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
  isToday,
  isBefore,
  isAfter,
  isWithinInterval,
} from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

export interface ClickableDateRangePickerProps {
  containerClassName?: string;
  icon?: React.ReactNode;
  startValue?: string;
  endValue?: string;
  startPlaceholder?: string;
  endPlaceholder?: string;
  onChange?: (range: { start: string; end: string }) => void;
  disabled?: boolean;
  min?: string;
  max?: string;
}

interface PopoverCoords {
  top: number;
  left: number;
  width: number;
}

const POPOVER_WIDTH = 288;
const POPOVER_HEIGHT = 400;
const SCREEN_PADDING = 12;
const MOBILE_BREAKPOINT = 768;

function parseDate(value?: string): Date | null {
  if (!value) return null;
  try {
    const parsed = parseISO(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

function formatDisplayDate(value?: string): string | null {
  const parsed = parseDate(value);
  return parsed ? format(parsed, 'dd/MM/yyyy') : null;
}

export function ClickableDateRangePicker({
  containerClassName = '',
  icon,
  startValue,
  endValue,
  startPlaceholder = 'เริ่ม',
  endPlaceholder = 'สิ้นสุด',
  onChange,
  disabled = false,
  min,
  max,
}: ClickableDateRangePickerProps) {
  const reduced = usePrefersReducedMotion();
  const overlayMotion = withReducedMotion(fadeOverlay, reduced);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<PopoverCoords | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [viewDate, setViewDate] = useState(() => parseDate(startValue) ?? new Date());
  const [draftStart, setDraftStart] = useState<Date | null>(null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(null);

  const minDate = parseDate(min);
  const maxDate = parseDate(max);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const anchor = parseDate(startValue) ?? parseDate(endValue);
    if (anchor) {
      setViewDate(anchor);
    }
  }, [startValue, endValue]);

  useEffect(() => {
    if (!isOpen) return;
    setDraftStart(parseDate(startValue));
    setDraftEnd(parseDate(endValue));
  }, [isOpen, startValue, endValue]);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (viewportWidth < MOBILE_BREAKPOINT) {
      setCoords(null);
      return;
    }

    let left = rect.left;
    if (left + POPOVER_WIDTH > viewportWidth - SCREEN_PADDING) {
      left = rect.right - POPOVER_WIDTH;
    }
    left = Math.max(SCREEN_PADDING, left);

    const spaceBelow = viewportHeight - rect.bottom - SCREEN_PADDING;
    const spaceAbove = rect.top - SCREEN_PADDING;

    let top: number;
    if (spaceBelow >= POPOVER_HEIGHT || spaceBelow >= spaceAbove) {
      top = rect.bottom + 8;
    } else {
      top = rect.top - POPOVER_HEIGHT - 8;
      top = Math.max(SCREEN_PADDING, top);
    }

    setCoords({ top, left, width: POPOVER_WIDTH });
  }, []);

  const openCalendar = useCallback(() => {
    if (disabled) return;
    calculatePosition();
    setIsOpen(true);
  }, [calculatePosition, disabled]);

  const closeCalendar = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;

    const handleRepositionEvent = () => {
      requestAnimationFrame(calculatePosition);
    };

    window.addEventListener('scroll', handleRepositionEvent, { passive: true, capture: true });
    window.addEventListener('resize', handleRepositionEvent, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleRepositionEvent, { capture: true });
      window.removeEventListener('resize', handleRepositionEvent);
    };
  }, [isOpen, calculatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      closeCalendar();
    };

    const timeout = setTimeout(() =>
      document.addEventListener('mousedown', handleClickOutside), 0
    );

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeCalendar]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeCalendar();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeCalendar]);

  const isDateDisabled = useCallback((date: Date) => {
    if (minDate && isBefore(date, minDate)) return true;
    if (maxDate && isAfter(date, maxDate)) return true;
    return false;
  }, [minDate, maxDate]);

  const commitRange = useCallback((start: Date, end: Date) => {
    onChange?.({
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
    });
    closeCalendar();
  }, [onChange, closeCalendar]);

  const handleSelectDay = (date: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDateDisabled(date)) return;

    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(date);
      setDraftEnd(null);
      return;
    }

    if (isBefore(date, draftStart)) {
      setDraftStart(date);
      setDraftEnd(null);
      return;
    }

    setDraftEnd(date);
    commitRange(draftStart, date);
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(prev => addMonths(prev, 1));
  };

  const displayValue = React.useMemo(() => {
    const startLabel = formatDisplayDate(startValue);
    const endLabel = formatDisplayDate(endValue);

    if (startLabel && endLabel) {
      return `${startLabel} — ${endLabel}`;
    }
    if (startLabel) {
      return `${startLabel} — ${endPlaceholder}`;
    }
    if (endLabel) {
      return `${startPlaceholder} — ${endLabel}`;
    }
    return `${startPlaceholder} — ${endPlaceholder}`;
  }, [startValue, endValue, startPlaceholder, endPlaceholder]);

  const monthStart = startOfMonth(viewDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: endOfMonth(viewDate) });
  const padDays = Array.from({ length: getDay(monthStart) });
  const dayLabels = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  const rangeStart = draftStart;
  const rangeEnd = draftEnd;

  const calendarContent = (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="เลือกช่วงวันที่"
      aria-modal="true"
      style={
        coords
          ? { position: 'fixed', top: coords.top, left: coords.left, width: coords.width, zIndex: 9999 }
          : {}
      }
      className={`
        bg-card rounded-3xl border border-border bb-shadow-xl p-5
        animate-in fade-in zoom-in-95 duration-200
        ${!coords
          ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-xs z-[9999]'
          : ''
        }
      `}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1.5 hover:bg-muted rounded-full text-foreground transition-colors cursor-pointer flex items-center justify-center"
          aria-label="เดือนก่อนหน้า"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[13px] font-normal text-foreground uppercase tracking-wider select-none">
          {format(viewDate, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1.5 hover:bg-muted rounded-full text-foreground transition-colors cursor-pointer flex items-center justify-center"
          aria-label="เดือนถัดไป"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground text-center mb-3 select-none">
        {!rangeStart || rangeEnd ? 'เลือกวันเริ่มต้น' : 'เลือกวันสิ้นสุด'}
      </p>

      <div className="grid grid-cols-7 gap-1 text-center mb-1" aria-hidden="true">
        {dayLabels.map((lbl, idx) => (
          <span
            key={idx}
            className={`text-[10px] font-normal tracking-wider select-none ${
              idx === 0 ? 'text-red-500' : 'text-muted-foreground'
            }`}
          >
            {lbl}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1" role="grid">
        {padDays.map((_, idx) => (
          <div key={`pad-${idx}`} className="aspect-square" aria-hidden="true" />
        ))}
        {daysInMonth.map(day => {
          const isStart = rangeStart ? isSameDay(day, rangeStart) : false;
          const isEnd = rangeEnd ? isSameDay(day, rangeEnd) : false;
          const isCurrent = isToday(day);
          const inRange =
            rangeStart && rangeEnd
              ? isWithinInterval(day, { start: rangeStart, end: rangeEnd })
              : false;
          const isDisabled = isDateDisabled(day);
          const isEndpoint = isStart || isEnd;

          return (
            <button
              key={day.toString()}
              type="button"
              disabled={isDisabled}
              aria-label={format(day, 'dd MMMM yyyy')}
              aria-pressed={isEndpoint}
              onClick={e => handleSelectDay(day, e)}
              className={`
                aspect-square rounded-xl text-[12px] font-normal
                flex items-center justify-center transition-all
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20
                ${isDisabled
                  ? 'text-muted-foreground/40 cursor-not-allowed'
                  : 'cursor-pointer'
                }
                ${isEndpoint
                  ? 'bg-foreground text-background bb-shadow-md'
                  : inRange
                  ? 'bg-muted text-foreground'
                  : isCurrent
                  ? 'bb-pastel-surface bg-[#ffda66] text-[#000000]'
                  : 'hover:bg-muted text-foreground'
                }
              `}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={`relative flex-1 ${containerClassName}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? closeCalendar() : openCalendar())}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`flex items-center justify-center gap-1.5 h-11 px-4 text-xs font-normal
          text-foreground bg-card hover:bg-muted/50 rounded-3xl border border-border
          transition-all duration-200 active:scale-95 uppercase
          tracking-wide bb-shadow-sm w-full min-w-0
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20
          ${disabled ? 'opacity-60 cursor-not-allowed hover:bg-card' : 'cursor-pointer'}`}
      >
        {icon || <CalendarIcon className="w-4 h-4 text-foreground shrink-0" />}
        <span className="truncate">{displayValue}</span>
      </button>

      {isMounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                key="date-range-picker-backdrop"
                className="fixed inset-0 bg-black/20 backdrop-blur-sm md:hidden"
                style={{ zIndex: 9998 }}
                initial={overlayMotion.initial}
                animate={overlayMotion.animate}
                exit={overlayMotion.exit}
                transition={overlayMotion.transition}
                onClick={closeCalendar}
                aria-hidden="true"
              />
              {calendarContent}
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
