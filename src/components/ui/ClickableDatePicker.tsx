'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  format, parseISO, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, addMonths, subMonths,
  getDay, isToday,
} from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ClickableDatePickerProps {
  containerClassName?: string;
  icon?: React.ReactNode;
  value?: string;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  min?: string;
  max?: string;
  className?: string;
  id?: string;
  name?: string;
}

// ─── Popover Position Type ────────────────────────────────────────────────────
// กำหนด type ให้ชัดเจนเพื่อหลีกเลี่ยง magic numbers ในโค้ด
interface PopoverCoords {
  top: number;
  left: number;
  width: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const POPOVER_WIDTH = 288;   // px — ความกว้างของ calendar popover
const POPOVER_HEIGHT = 370;  // px — ความสูงโดยประมาณ (ใช้สำหรับคำนวณพื้นที่ก่อน mount)
const SCREEN_PADDING = 12;   // px — ระยะห่างขั้นต่ำจากขอบหน้าจอ
const MOBILE_BREAKPOINT = 768; // px — md breakpoint ของ Tailwind

export function ClickableDatePicker({
  containerClassName = '',
  icon,
  value,
  placeholder,
  onChange,
  disabled = false,
}: ClickableDatePickerProps) {
  // ─── Refs ─────────────────────────────────────────────────────────────────
  const triggerRef = useRef<HTMLButtonElement>(null);  // ปุ่มที่ user กด
  const popoverRef = useRef<HTMLDivElement>(null);     // calendar popover เอง

  // ─── State ────────────────────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<PopoverCoords | null>(null);
  const [isMounted, setIsMounted] = useState(false); // ป้องกัน SSR hydration error

  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      try { return parseISO(value); } catch { /* ignore */ }
    }
    return new Date();
  });

  // ─── Hydration guard: Portal ต้องรอ client ─────────────────────────────────
  // SSR จะไม่มี document.body ดังนั้นต้องรอให้ component mount ก่อนเสมอ
  useEffect(() => { setIsMounted(true); }, []);

  // ─── Sync viewDate เมื่อ value prop เปลี่ยนจากภายนอก ────────────────────
  useEffect(() => {
    if (value) {
      try { setViewDate(parseISO(value)); } catch { /* ignore */ }
    }
  }, [value]);

  // ─── Core: คำนวณตำแหน่ง popover แบบ smart ────────────────────────────────
  //
  // นี่คือหัวใจของการแก้ไข เราคำนวณพิกัดจริงบนหน้าจอ (fixed coordinates)
  // โดยพิจารณา 4 กรณี:
  //   1. เปิดลง + ชิดซ้าย  (กรณีปกติ)
  //   2. เปิดลง + ชิดขวา  (เมื่อ popover จะเกินขอบขวา)
  //   3. เปิดขึ้น + ชิดซ้าย (เมื่อพื้นที่ด้านล่างไม่พอ)
  //   4. เปิดขึ้น + ชิดขวา (worst case — ด้านล่างไม่พอ และจะเกินขอบขวา)
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Mobile: ใช้ fixed center แทนการคำนวณตำแหน่ง
    // เพราะหน้าจอเล็กเกินกว่าจะหา "best corner" ได้มีความหมาย
    if (viewportWidth < MOBILE_BREAKPOINT) {
      setCoords(null); // null = mobile center mode
      return;
    }

    // ─── คำนวณแนวนอน ──────────────────────────────────────────────────────
    // เริ่มต้นให้ left edge ของ popover ตรงกับ left edge ของ trigger
    let left = rect.left;

    // ถ้า popover จะเกินขอบขวา ให้เลื่อน popover มาชิดขวาของ trigger แทน
    if (left + POPOVER_WIDTH > viewportWidth - SCREEN_PADDING) {
      left = rect.right - POPOVER_WIDTH;
    }

    // ถ้าเลื่อนแล้วยังเกินขอบซ้าย ให้ clamp ไว้ที่ขอบซ้าย
    left = Math.max(SCREEN_PADDING, left);

    // ─── คำนวณแนวตั้ง ──────────────────────────────────────────────────────
    // พื้นที่ด้านล่าง trigger
    const spaceBelow = viewportHeight - rect.bottom - SCREEN_PADDING;
    // พื้นที่ด้านบน trigger
    const spaceAbove = rect.top - SCREEN_PADDING;

    let top: number;

    if (spaceBelow >= POPOVER_HEIGHT || spaceBelow >= spaceAbove) {
      // เปิดลงข้างล่าง: ดีที่สุด (ตามธรรมชาติของ UI)
      top = rect.bottom + 8;
    } else {
      // เปิดขึ้นข้างบน: เมื่อพื้นที่ด้านล่างไม่พอ
      top = rect.top - POPOVER_HEIGHT - 8;
      // ถ้าเปิดขึ้นแล้วยังเกินขอบบน ให้ clamp เอาไว้
      top = Math.max(SCREEN_PADDING, top);
    }

    setCoords({ top, left, width: POPOVER_WIDTH });
  }, []);

  // ─── เปิด/ปิด calendar พร้อมคำนวณตำแหน่ง ──────────────────────────────────
  const openCalendar = useCallback(() => {
    if (disabled) return;
    calculatePosition();
    setIsOpen(true);
  }, [calculatePosition, disabled]);

  const closeCalendar = useCallback(() => setIsOpen(false), []);

  // ─── Re-calculate เมื่อ scroll หรือ resize ────────────────────────────────
  // ถ้า user scroll หรือ resize หน้าต่างขณะที่ calendar เปิดอยู่
  // ตำแหน่งเดิมจะผิดพลาด ต้องคำนวณใหม่ตลอดเวลา
  useEffect(() => {
    if (!isOpen) return;

    const handleRepositionEvent = () => {
      // ใช้ requestAnimationFrame เพื่อให้ browser layout เสร็จก่อนอ่านค่า
      // (หลีกเลี่ยง "layout thrashing" ที่เกิดจากการอ่าน/เขียน DOM สลับกัน)
      requestAnimationFrame(calculatePosition);
    };

    window.addEventListener('scroll', handleRepositionEvent, { passive: true, capture: true });
    window.addEventListener('resize', handleRepositionEvent, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleRepositionEvent, { capture: true });
      window.removeEventListener('resize', handleRepositionEvent);
    };
  }, [isOpen, calculatePosition]);

  // ─── ปิด calendar เมื่อ click outside ────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // ตรวจสอบทั้ง trigger button และ popover เอง
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) return;
      closeCalendar();
    };

    // ใช้ setTimeout เพื่อให้ event loop รอบปัจจุบัน (ที่เปิด calendar) จบก่อน
    // ป้องกัน calendar เปิดแล้วปิดทันทีใน click เดียวกัน
    const timeout = setTimeout(() =>
      document.addEventListener('mousedown', handleClickOutside), 0
    );

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeCalendar]);

  // ─── Keyboard: ปิดด้วย Escape ─────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeCalendar();
        triggerRef.current?.focus(); // คืน focus ให้ trigger หลังปิด (accessibility)
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeCalendar]);

  // ─── Calendar navigation ──────────────────────────────────────────────────
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
    onChange?.({
      target: { value: format(date, 'yyyy-MM-dd') },
    } as React.ChangeEvent<HTMLInputElement>);
    closeCalendar();
  };

  // ─── Display value ────────────────────────────────────────────────────────
  const displayValue = React.useMemo(() => {
    if (value) {
      try { return format(parseISO(value), 'dd/MM/yyyy'); } catch { return value; }
    }
    return placeholder || 'เลือกวันที่';
  }, [value, placeholder]);

  // ─── Calendar grid data ───────────────────────────────────────────────────
  const monthStart = startOfMonth(viewDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: endOfMonth(viewDate) });
  const padDays = Array.from({ length: getDay(monthStart) });
  const selectedDate = value ? parseISO(value) : null;
  const dayLabels = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  // ─── Popover calendar JSX ──────────────────────────────────────────────────
  // แยก JSX ออกมาเพื่อใช้ทั้งใน Portal (desktop) และ fixed center (mobile)
  const calendarContent = (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="เลือกวันที่"
      aria-modal="true"
      style={
        // Desktop: ใช้ coords ที่คำนวณได้
        // Mobile (coords === null): ใช้ CSS class center แทน (ดูด้านล่าง)
        coords
          ? { position: 'fixed', top: coords.top, left: coords.left, width: coords.width, zIndex: 9999 }
          : {}
      }
      className={`
        bg-card rounded-3xl border border-border shadow-2xl p-5
        animate-in fade-in zoom-in-95 duration-200
        ${!coords
          ? // Mobile: fixed center ผ่าน CSS class ล้วนๆ ไม่พึ่ง JS coordinates
            'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-xs z-[9999]'
          : ''
        }
      `}
      // ป้องกัน click บน popover ทะลุลงไป document (ทำให้ปิดตัวเอง)
      onMouseDown={e => e.stopPropagation()}
    >
      {/* ── Header: เดือน + ปี ── */}
      <div className="flex items-center justify-between mb-4">
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

      {/* ── Weekday labels ── */}
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

      {/* ── Days grid ── */}
      <div className="grid grid-cols-7 gap-1" role="grid">
        {padDays.map((_, idx) => (
          <div key={`pad-${idx}`} className="aspect-square" aria-hidden="true" />
        ))}
        {daysInMonth.map(day => {
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const isCurrent = isToday(day);
          return (
            <button
              key={day.toString()}
              type="button"
              role="gridcell"
              aria-label={format(day, 'dd MMMM yyyy')}
              aria-pressed={isSelected}
              onClick={e => handleSelectDay(day, e)}
              className={`
                aspect-square rounded-xl text-[12px] font-normal
                flex items-center justify-center transition-all cursor-pointer
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20
                ${isSelected
                  ? 'bg-foreground text-background shadow-md'
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
    // ไม่มี z-index บน container อีกต่อไป เพราะ popover หลุดออกไป document.body แล้ว
    <div className={`relative flex-1 ${containerClassName}`}>

      {/* ── Trigger button ── */}
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
          tracking-wide shadow-sm w-full
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20
          ${disabled ? 'opacity-60 cursor-not-allowed hover:bg-card' : 'cursor-pointer'}`}
      >
        {icon || <CalendarIcon className="w-4 h-4 text-foreground" />}
        <span>{displayValue}</span>
      </button>

      {/* ── Popover via Portal ── */}
      {isOpen && isMounted && createPortal(
        <>
          {/* Mobile overlay: backdrop เฉพาะมือถือ */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm bb-modal-backdrop md:hidden"
            style={{ zIndex: 9998 }}
            onClick={closeCalendar}
            aria-hidden="true"
          />
          {calendarContent}
        </>,
        document.body
      )}
    </div>
  );
}