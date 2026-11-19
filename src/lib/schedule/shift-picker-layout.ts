/**
 * Schedule shift cell picker layout contract.
 * Position math lives in shift-picker-position.ts; UI must import these classes
 * from here so regression tests can lock the behavior.
 */

export const SCHEDULE_SHIFT_PICKER_PANEL_CLASS =
  'bb-schedule-shift-picker absolute flex h-max w-[min(12rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl animate-in fade-in slide-in-from-top-2';

export const SCHEDULE_SHIFT_PICKER_LIST_CLASS =
  'grid min-h-0 flex-1 gap-1 overflow-y-auto bb-smooth-scroll overscroll-y-contain p-2';

export const SCHEDULE_SHIFT_PICKER_BACKDROP_CLASS =
  'fixed inset-0 z-[99999] overflow-hidden bg-black/10 backdrop-blur-[1px]';