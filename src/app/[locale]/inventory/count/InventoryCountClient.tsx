'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Loader2, CheckCircle2, ClipboardList, AlertCircle, RefreshCcw, Undo2, Clock3, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { microFadeDown, microPopIn, staggerListItem } from '@/lib/motion-presets';
import Link from 'next/link';
import {
  fetchCountAccuracyStats,
  recordInventoryCountAndUpdateStock,
  updateInventoryStock,
} from '@/app/actions/inventory-actions';
import type {
  CountAccuracyStatsResult,
  InventoryCountSaveOptions,
  TodayCountSessionStatus,
} from '@/app/actions/inventory-actions';
import { useInventoryRealtime } from '@/contexts/InventoryRealtimeContext';
import { getClientSessionId } from '@/lib/client-session';
import {
  applyCountVerificationToAccuracyStats,
  isCountMatch,
  mergeAccuracyStatsPreferringHigherChecks,
  removeCountVerificationFromAccuracyStats,
} from '@/lib/inventory-count-accuracy';
import { mergeInventoryRealtimeUpdate } from '@/lib/inventory-stock';
import {
  applyItemTodayCount,
  formatInventoryCountTime,
  removeItemTodayCount,
  type ItemTodayCountRecord,
} from '@/lib/inventory-count-today';
import { isSameThaiDay } from '@/lib/date-utils';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import { INVENTORY_COUNT_SELECT } from '@/lib/inventory-queries';
import {
  isCountAdjustUnlocked,
  setCountAdjustUnlocked,
} from '@/lib/inventory-count-adjust-access';
import { CountAdjustPinDialog } from '@/app/[locale]/inventory/count/_components/CountAdjustPinDialog';
import { useReadOnly, READ_ONLY_DENY_MSG } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils';
import { PASTEL_SURFACE } from '@/lib/shift-colors';
import { getInventoryCountInputName } from '@/lib/inventory-grid-cell-a11y';

type CountPageMode = 'count' | 'adjust';

interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  unit: string;
  sort_order: number;
  count_policy?: 'exact_count' | 'sufficiency_check';
  [key: string]: unknown;
}

// ─── Undo state per item ──────────────────────────────────────────────────────
type UndoEntry = {
  prevStock: number; // The value before the last save can be restored once
};

// ─── CountInput ───────────────────────────────────────────────────────────────
// Rules:
//   • Save is triggered by Enter, mobile keyboard next/done (form submit), or Tab.
//   • Moving focus to another count row also commits the current draft (mobile "next").
//   • Blur elsewhere discards the draft without saving (deferred to avoid mobile blur-before-enter races).
const CountInput = memo(function CountInput({
  index,
  onSave,
  disabled = false,
  isActive = false,
  onActiveChange,
  itemId,
  placeholder = 'จำนวน',
}: {
  index: number;
  onSave: (id: string, value: number) => Promise<void>;
  disabled?: boolean;
  isActive?: boolean;
  onActiveChange?: (id: string | null) => void;
  itemId: string;
  placeholder?: string;
}) {
  const [val, setVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef('');
  const isSavingRef = useRef(false);
  const committingRef = useRef(false);

  const syncValue = useCallback((value: string) => {
    valueRef.current = value;
    setVal(value);
  }, []);

  const clearDraft = useCallback(() => {
    valueRef.current = '';
    setVal('');
    onActiveChange?.(null);
  }, [onActiveChange]);

  const focusNextInput = useCallback(() => {
    const nextInput = document.querySelector(
      `input[data-count-row-index="${index + 1}"]`,
    ) as HTMLInputElement | null;
    if (!nextInput) return;
    window.setTimeout(() => {
      nextInput.focus();
      nextInput.select();
    }, 10);
  }, [index]);

  const commitSave = useCallback(async () => {
    if (disabled || isSavingRef.current) return false;
    const rawVal = valueRef.current.trim();
    if (rawVal === '') {
      clearDraft();
      return false;
    }
    const numberVal = Number(rawVal);
    const sanitized = isNaN(numberVal) ? 0 : Math.max(0, numberVal);
    isSavingRef.current = true;
    committingRef.current = true;
    valueRef.current = '';
    setVal('');
    onActiveChange?.(null);
    // Do not await the server round-trip next-row focus must stay instant.
    // Errors still surface via handleSaveStock (optimistic rollback + toast).
    void onSave(itemId, sanitized).finally(() => {
      isSavingRef.current = false;
      committingRef.current = false;
    });
    return true;
  }, [clearDraft, disabled, itemId, onActiveChange, onSave]);

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      void commitSave().then((saved) => {
        if (saved) focusNextInput();
      });
    },
    [commitSave, focusNextInput],
  );

  const handleBlur = useCallback(() => {
    window.setTimeout(() => {
      if (committingRef.current || isSavingRef.current) return;

      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement &&
        active.dataset.countRowIndex !== undefined &&
        active !== inputRef.current
      ) {
        if (valueRef.current.trim() !== '') {
          void commitSave();
        } else {
          onActiveChange?.(null);
        }
        return;
      }

      if (inputRef.current === document.activeElement) return;
      clearDraft();
    }, 0);
  }, [clearDraft, commitSave, onActiveChange]);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col items-end gap-1.5"
      data-count-row-index={index}
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        enterKeyHint="next"
        name={getInventoryCountInputName(itemId, 'count')}
        aria-label="จำนวนนับ"
        value={val}
        placeholder={placeholder}
        onChange={(e) => {
          let value = e.target.value.replace(/[^0-9.]/g, '');
          if (value.length > 1 && value.startsWith('0') && !value.startsWith('0.')) {
            value = value.replace(/^0+/, '');
          }
          syncValue(value);
        }}
        onFocus={() => {
          onActiveChange?.(itemId);
          inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            void commitSave().then((saved) => {
              if (saved) focusNextInput();
            });
          }
          if (e.key === 'Escape') {
            clearDraft();
            inputRef.current?.blur();
          }
        }}
        data-count-row-index={index}
        disabled={disabled}
        className={cn(
          'px-3 rounded-xl border text-base font-normal text-center outline-none tabular-nums bb-transition duration-200 bb-pastel-surface bg-white text-black placeholder:text-black/45',
          isActive
            ? 'w-28 h-11 border-black/30 ring-2 ring-black/10 bb-shadow-sm'
            : 'w-24 h-10 border-black/25 bb-shadow-sm focus:border-black/35 focus-visible:ring-1 focus-visible:ring-black/15',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      />
      <AnimatePresence>
        {isActive && val.length > 0 && (
          <motion.span
            {...microFadeDown}
            transition={microFadeDown.transition}
            className="text-[9px] text-black/40 bb-pastel-surface tracking-wide"
          >
            กด Enter เพื่อยืนยัน
          </motion.span>
        )}
      </AnimatePresence>
    </form>
  );
});

function formatAdjustStockDisplay(stock: number): string {
  const value = Number(stock);
  if (!Number.isFinite(value) || value === 0) return '';
  return String(value);
}

// Adjust tab: pre-filled with current stock; stays editable after every save.
const AdjustStockInput = memo(function AdjustStockInput({
  index,
  stock,
  onSave,
  disabled = false,
  isActive = false,
  onActiveChange,
  itemId,
}: {
  index: number;
  stock: number;
  onSave: (id: string, value: number) => Promise<void>;
  disabled?: boolean;
  isActive?: boolean;
  onActiveChange?: (id: string | null) => void;
  itemId: string;
}) {
  const [val, setVal] = useState(() => formatAdjustStockDisplay(stock));
  const inputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(val);
  const isSavingRef = useRef(false);
  const committingRef = useRef(false);
  const isEditingRef = useRef(false);

  useEffect(() => {
    if (!isEditingRef.current) {
      const next = formatAdjustStockDisplay(stock);
      valueRef.current = next;
      setVal(next);
    }
  }, [stock]);

  const syncValue = useCallback((value: string) => {
    valueRef.current = value;
    setVal(value);
  }, []);

  const clearEditing = useCallback(() => {
    isEditingRef.current = false;
    onActiveChange?.(null);
  }, [onActiveChange]);

  const focusNextInput = useCallback(() => {
    const nextInput = document.querySelector(
      `input[data-count-row-index="${index + 1}"]`,
    ) as HTMLInputElement | null;
    if (!nextInput) return;
    window.setTimeout(() => {
      nextInput.focus();
      nextInput.select();
    }, 10);
  }, [index]);

  const commitSave = useCallback(async () => {
    if (disabled || isSavingRef.current) return false;
    const rawVal = valueRef.current.trim();
    if (rawVal === '') {
      clearEditing();
      return false;
    }
    const numberVal = Number(rawVal);
    const sanitized = Number.isNaN(numberVal) ? 0 : Math.max(0, numberVal);
    isSavingRef.current = true;
    committingRef.current = true;
    isEditingRef.current = false;
    onActiveChange?.(null);
    void onSave(itemId, sanitized).finally(() => {
      isSavingRef.current = false;
      committingRef.current = false;
    });
    return true;
  }, [clearEditing, disabled, itemId, onActiveChange, onSave]);

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      void commitSave().then((saved) => {
        if (saved) focusNextInput();
      });
    },
    [commitSave, focusNextInput],
  );

  const handleBlur = useCallback(() => {
    window.setTimeout(() => {
      if (committingRef.current || isSavingRef.current) return;

      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement &&
        active.dataset.countRowIndex !== undefined &&
        active !== inputRef.current
      ) {
        if (valueRef.current.trim() !== '') {
          void commitSave();
        } else {
          clearEditing();
        }
        return;
      }

      if (inputRef.current === document.activeElement) return;
      isEditingRef.current = false;
      const next = formatAdjustStockDisplay(stock);
      valueRef.current = next;
      setVal(next);
      onActiveChange?.(null);
    }, 0);
  }, [clearEditing, commitSave, onActiveChange, stock]);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col items-end gap-1.5"
      data-count-row-index={index}
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        enterKeyHint="next"
        name={getInventoryCountInputName(itemId, 'adjust')}
        aria-label="ปรับสต็อก"
        value={val}
        placeholder="ใหม่"
        onChange={(e) => {
          isEditingRef.current = true;
          let value = e.target.value.replace(/[^0-9.]/g, '');
          if (value.length > 1 && value.startsWith('0') && !value.startsWith('0.')) {
            value = value.replace(/^0+/, '');
          }
          syncValue(value);
        }}
        onFocus={() => {
          isEditingRef.current = true;
          onActiveChange?.(itemId);
          inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            void commitSave().then((saved) => {
              if (saved) focusNextInput();
            });
          }
          if (e.key === 'Escape') {
            isEditingRef.current = false;
            const next = formatAdjustStockDisplay(stock);
            valueRef.current = next;
            setVal(next);
            clearEditing();
            inputRef.current?.blur();
          }
        }}
        data-count-row-index={index}
        disabled={disabled}
        className={cn(
          'px-3 rounded-xl border text-base font-normal text-center outline-none tabular-nums bb-transition duration-200 bb-pastel-surface bg-white text-black placeholder:text-black/45',
          isActive
            ? 'w-28 h-11 border-black/30 ring-2 ring-black/10 bb-shadow-sm'
            : 'w-24 h-10 border-black/25 bb-shadow-sm focus:border-black/35 focus-visible:ring-1 focus-visible:ring-black/15',
          disabled && 'opacity-60 cursor-not-allowed',
        )}
      />
      <AnimatePresence>
        {isActive && val.length > 0 && (
          <motion.span
            {...microFadeDown}
            transition={microFadeDown.transition}
            className="text-[9px] text-black/40 bb-pastel-surface tracking-wide"
          >
            กด Enter เพื่อยืนยัน
          </motion.span>
        )}
      </AnimatePresence>
    </form>
  );
});

const STAGGER_ANIMATION_CAP = 15;

function createEmptyTodayStatus(totalItems: number): TodayCountSessionStatus {
  return {
    perItem: {},
    session: {
      totalItems,
      countedTodayCount: 0,
      firstCountedAt: null,
      lastCountedAt: null,
      hasCountedToday: false,
      isFullyCountedToday: false,
    },
  };
}

function buildInitialLastVerification(
  todayStatus: TodayCountSessionStatus | null | undefined,
  accuracyStats: CountAccuracyStatsResult | null | undefined,
  items: InventoryItem[],
): Record<string, { matched: boolean; systemStockQty: number; countedQty: number }> {
  if (!todayStatus) return {};

  const result: Record<string, { matched: boolean; systemStockQty: number; countedQty: number }> = {};

  for (const item of items) {
    const todayRow = todayStatus.perItem[item.id];
    if (!todayRow) continue;

    const stats = accuracyStats?.perItem[item.id];
    const systemStockQty = todayRow.systemStockQty ?? stats?.lastSystemStockQty ?? 0;
    const matched =
      item.count_policy === 'exact_count' &&
      stats?.lastMatched != null &&
      stats.lastCountedAt &&
      isSameThaiDay(stats.lastCountedAt, todayRow.countedAt)
        ? stats.lastMatched
        : todayRow.countedQty === systemStockQty;

    result[item.id] = {
      matched,
      systemStockQty,
      countedQty: todayRow.countedQty,
    };
  }

  return result;
}

function TodayCountSessionBanner({ status }: { status: TodayCountSessionStatus }) {
  const { session } = status;
  const progressPct =
    session.totalItems > 0
      ? Math.min(100, Math.round((session.countedTodayCount / session.totalItems) * 100))
      : 0;

  return (
    <section
      aria-label="สถานะการนับสต็อกวันนี้"
      className="mb-5 rounded-3xl border border-border bg-card p-4 bb-shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'shrink-0 rounded-2xl p-2.5',
            session.isFullyCountedToday
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
              : session.hasCountedToday
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                : 'bg-muted text-muted-foreground',
          )}
        >
          {session.isFullyCountedToday ? (
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          ) : (
            <Clock3 className="h-5 w-5" aria-hidden />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {session.isFullyCountedToday
              ? 'นับครบทุกรายการแล้ววันนี้'
              : session.hasCountedToday
                ? 'กำลังนับสต็อกวันนี้'
                : 'ยังไม่มีการนับสต็อกวันนี้'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {session.hasCountedToday && session.lastCountedAt
              ? `อัปเดตล่าสุด ${formatInventoryCountTime(session.lastCountedAt)}`
              : 'เมื่อบันทึกจำนวนแล้ว ทีมทุกคนจะเห็นสถานะนี้ทันที'}
          </p>

          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>ความคืบหน้าวันนี้</span>
              <span className="tabular-nums">
                {session.countedTodayCount}/{session.totalItems} รายการ ({progressPct}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full bb-transition duration-500',
                  session.isFullyCountedToday ? 'bg-emerald-500' : 'bg-foreground/70',
                )}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const COUNT_STATUS_BADGE_CLASS =
  'inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/80 px-2 py-0.5 text-[10px] text-black/70 bb-pastel-surface';

function formatCountMatchLabel(
  matched: boolean,
  countedQty: number,
  systemStockQty: number,
): string {
  return `${matched ? 'ตรง' : 'ไม่ตรง'} (นับ ${countedQty}, ระบบ: ${systemStockQty})`;
}

function getCountMatchBadgeClass(matched: boolean): string {
  return cn(
    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] text-black bb-pastel-surface',
    matched
      ? 'bg-[#d4edda] border border-[#c3e6cb]'
      : 'bg-[#fff3cd] border border-[#ffeeba]',
  );
}

type CountItemRowProps = {
  item: InventoryItem;
  index: number;
  isActive: boolean;
  isDimmed: boolean;
  animateEntrance: boolean;
  recentVerification?: { matched: boolean; systemStockQty: number; countedQty: number };
  todayCount?: ItemTodayCountRecord;
  undoEntry?: UndoEntry;
  onSave: (id: string, value: number) => Promise<void>;
  onUndo: (id: string) => void;
  isReadOnly: boolean;
  onActiveChange: (id: string | null) => void;
};


const CountItemRow = memo(function CountItemRow({
  item,
  index,
  isActive,
  isDimmed,
  animateEntrance,
  recentVerification,
  todayCount,
  undoEntry,
  onSave,
  onUndo,
  isReadOnly,
  onActiveChange,
}: CountItemRowProps) {
  const isSufficiencyCheck = item.count_policy === 'sufficiency_check';
  const rowToneClass = isSufficiencyCheck
    ? `${PASTEL_SURFACE} bg-[#f8d7da] border border-[#f5c6cb]`
    : `${PASTEL_SURFACE} bg-[#dbeafe] border border-[#bfdbfe]`;

  return (
    <motion.div
      initial={animateEntrance ? staggerListItem.initial : false}
      animate={{
        opacity: isDimmed ? 0.42 : 1,
        y: 0,
        scale: isActive ? 1.015 : 1,
      }}
      transition={{
        duration: 0.2,
        delay: animateEntrance && index < STAGGER_ANIMATION_CAP ? index * 0.02 : 0,
      }}
      className={cn(
        'relative rounded-2xl p-4 flex items-start justify-between gap-3 bb-transition duration-300',
        rowToneClass,
        isActive
          ? 'bb-shadow-md ring-2 ring-black/8 z-10'
          : 'bb-shadow-sm hover:ring-1 hover:ring-black/5',
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-black/70" />
      )}

      <div className="flex items-start gap-3 flex-1 min-w-0 pl-1">
        <span
          className={cn(
            'text-[12px] font-normal tabular-nums shrink-0 rounded-lg px-2 py-0.5 bb-transition duration-200',
            isActive
              ? 'bg-black text-white'
              : 'bg-white/60 text-black/55'
          )}
        >
          {(index + 1).toString().padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'font-normal text-[15px] leading-tight transition-colors duration-200',
                'text-black',
              )}
            >
              {item.name}
            </span>
            {item.unit ? (
              <span className="rounded-full border border-black/10 bg-white/70 px-2 py-0.5 text-[10px] text-black/60 bb-pastel-surface">
                {item.unit}
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {recentVerification ? (
              <span className={getCountMatchBadgeClass(recentVerification.matched)}>
                {formatCountMatchLabel(
                  recentVerification.matched,
                  recentVerification.countedQty,
                  recentVerification.systemStockQty,
                )}
              </span>
            ) : null}
            {todayCount ? (
              <span className={COUNT_STATUS_BADGE_CLASS}>
                <Clock3 className="h-3 w-3" aria-hidden />
                นับเมื่อ {formatInventoryCountTime(todayCount.countedAt)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end gap-2">
        <CountInput
          itemId={item.id}
          index={index}
          onSave={onSave}
          disabled={isReadOnly}
          isActive={isActive}
          onActiveChange={onActiveChange}
        />
        {/* 1-time undo button per item shown after a save, while undoEntry exists */}
        <AnimatePresence>
          {undoEntry && !isReadOnly && (
            <motion.button
              type="button"
              {...microPopIn}
              transition={microPopIn.transition}
              onClick={() => onUndo(item.id)}
              className="flex items-center gap-1 rounded-xl border border-black/15 bg-white/80 bb-pastel-surface px-2.5 py-1 text-[11px] text-black/60 bb-shadow-sm hover:bg-white hover:text-black bb-transition"
              aria-label={`ย้อนกลับค่าเดิม (${undoEntry.prevStock})`}
            >
              <Undo2 className="w-3 h-3" />
              <span>ย้อนกลับ ({undoEntry.prevStock})</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

function CountPageTabSwitcher({
  mode,
  onChange,
}: {
  mode: CountPageMode;
  onChange: (mode: CountPageMode) => void;
}) {
  const tabButtonClass = (tab: CountPageMode) =>
    cn(
      'flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-[13px] rounded-full border bb-transition duration-200 font-normal whitespace-nowrap',
      mode === tab
        ? 'bg-foreground border-foreground text-background bb-shadow-sm'
        : 'border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50',
    );

  return (
    <div
      role="tablist"
      aria-label="สลับระหว่างตรวจนับและปรับจำนวน"
      className="mb-5 flex gap-2"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'count'}
        onClick={() => onChange('count')}
        className={tabButtonClass('count')}
      >
        <ClipboardList className="h-4 w-4 shrink-0" aria-hidden />
        <span>ตรวจนับ</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'adjust'}
        onClick={() => onChange('adjust')}
        className={tabButtonClass('adjust')}
      >
        <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden />
        <span>ปรับจำนวน</span>
      </button>
    </div>
  );
}

type AdjustItemRowProps = {
  item: InventoryItem;
  index: number;
  isActive: boolean;
  isDimmed: boolean;
  animateEntrance: boolean;
  onSave: (id: string, value: number) => Promise<void>;
  isReadOnly: boolean;
  onActiveChange: (id: string | null) => void;
};

const AdjustItemRow = memo(function AdjustItemRow({
  item,
  index,
  isActive,
  isDimmed,
  animateEntrance,
  onSave,
  isReadOnly,
  onActiveChange,
}: AdjustItemRowProps) {
  const isSufficiencyCheck = item.count_policy === 'sufficiency_check';
  const rowToneClass = isSufficiencyCheck
    ? `${PASTEL_SURFACE} bg-[#f8d7da] border border-[#f5c6cb]`
    : `${PASTEL_SURFACE} bg-[#dbeafe] border border-[#bfdbfe]`;

  return (
    <motion.div
      initial={animateEntrance ? staggerListItem.initial : false}
      animate={{
        opacity: isDimmed ? 0.42 : 1,
        y: 0,
        scale: isActive ? 1.015 : 1,
      }}
      transition={{
        duration: 0.2,
        delay: animateEntrance && index < STAGGER_ANIMATION_CAP ? index * 0.02 : 0,
      }}
      className={cn(
        'relative rounded-2xl p-4 flex items-start justify-between gap-3 bb-transition duration-300',
        rowToneClass,
        isActive
          ? 'bb-shadow-md ring-2 ring-black/8 z-10'
          : 'bb-shadow-sm hover:ring-1 hover:ring-black/5',
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-black/70" />
      )}

      <div className="flex items-start gap-3 flex-1 min-w-0 pl-1">
        <span
          className={cn(
            'text-[12px] font-normal tabular-nums shrink-0 rounded-lg px-2 py-0.5 bb-transition duration-200',
            isActive
              ? 'bg-black text-white'
              : 'bg-white/60 text-black/55',
          )}
        >
          {(index + 1).toString().padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-normal text-[15px] leading-tight text-black">
              {item.name}
            </span>
            {item.unit ? (
              <span className="rounded-full border border-black/10 bg-white/70 px-2 py-0.5 text-[10px] text-black/60 bb-pastel-surface">
                {item.unit}
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={COUNT_STATUS_BADGE_CLASS}>
              คงเหลือ {Number(item.stock) || 0}
            </span>
          </div>
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end gap-2">
        <AdjustStockInput
          itemId={item.id}
          stock={Number(item.stock) || 0}
          index={index}
          onSave={onSave}
          disabled={isReadOnly}
          isActive={isActive}
          onActiveChange={onActiveChange}
        />
      </div>
    </motion.div>
  );
});

interface InventoryCountClientProps {
  initialItems: InventoryItem[];
  initialAccuracyStats?: CountAccuracyStatsResult | null;
  initialTodayStatus?: TodayCountSessionStatus | null;
  locale: string;
  embedded?: boolean;
  initialPageMode?: CountPageMode;
}

export default function InventoryCountClient({
  initialItems,
  initialAccuracyStats = null,
  initialTodayStatus = null,
  locale,
  embedded = false,
  initialPageMode = 'count',
}: InventoryCountClientProps) {
  const isReadOnly = useReadOnly();
  const { subscribe } = useInventoryRealtime();
  const [adjustUnlocked, setAdjustUnlocked] = useState(() => isCountAdjustUnlocked());
  const [adjustPinOpen, setAdjustPinOpen] = useState(false);

  useEffect(() => {
    if (embedded && initialPageMode === 'adjust' && !adjustUnlocked) {
      setAdjustPinOpen(true);
    }
  }, [adjustUnlocked, embedded, initialPageMode]);

  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const [loading, setLoading] = useState(false);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'synced'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [pageMode, setPageMode] = useState<CountPageMode>(initialPageMode);
  const accuracyStatsRef = useRef<CountAccuracyStatsResult | null>(initialAccuracyStats);
  const accuracyTouchedRef = useRef(false);
  const [todayStatus, setTodayStatus] = useState<TodayCountSessionStatus>(
    () => initialTodayStatus ?? createEmptyTodayStatus(initialItems.length),
  );
  const todayStatusRef = useRef(todayStatus);
  const [lastVerification, setLastVerification] = useState<
    Record<string, { matched: boolean; systemStockQty: number; countedQty: number }>
  >(() => buildInitialLastVerification(initialTodayStatus, initialAccuracyStats, initialItems));
  const lastVerificationRef = useRef(lastVerification);
  // Per-item undo state: maps itemId → UndoEntry. Cleared after one use.
  const [undoMap, setUndoMap] = useState<Record<string, UndoEntry>>({});
  const [animateEntrance] = useState(
    () => initialItems.length <= STAGGER_ANIMATION_CAP,
  );

  useEffect(() => {
    todayStatusRef.current = todayStatus;
    lastVerificationRef.current = lastVerification;
  });

  const [prevItemsLength, setPrevItemsLength] = useState(items.length);
  if (items.length !== prevItemsLength) {
    setPrevItemsLength(items.length);
    setTodayStatus((prev) => ({
      ...prev,
      session: {
        ...prev.session,
        totalItems: items.length,
        isFullyCountedToday:
          items.length > 0 && prev.session.countedTodayCount >= items.length,
      },
    }));
  }

  const loadAccuracyStats = useCallback(async () => {
    const res = await fetchCountAccuracyStats();
    if (res.success && res.data) {
      const fetchedStats = res.data;
      accuracyStatsRef.current = accuracyTouchedRef.current
        ? mergeAccuracyStatsPreferringHigherChecks(fetchedStats, accuracyStatsRef.current)
        : fetchedStats;
    }
  }, []);

  useEffect(() => {
    if (initialAccuracyStats) return;
    void loadAccuracyStats();
  }, [initialAccuracyStats, loadAccuracyStats]);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      await ensureSupabaseSession();
      const { data, error } = await supabase
        .from('inventory_items')
        .select(INVENTORY_COUNT_SELECT)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Supabase Error (Count Fetch):', error.message, error.details);
        throw error;
      }

      setItems(data || []);
    } catch (err) {
      console.error('Failed to load inventory for count:', err);
      setItems([]);
      setErrorMessage('ไม่สามารถเปิดหน้าตรวจนับคลังสินค้าได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    return subscribe((payload) => {
      if (payload.eventType === 'INSERT') {
        setItems((prev) => {
          if (prev.find((i) => i.id === payload.new.id)) return prev;
          return [...prev, payload.new as InventoryItem].sort((a, b) => a.sort_order - b.sort_order);
        });
      } else if (payload.eventType === 'UPDATE') {
        setItems((prev) =>
          prev
            .map((item) =>
              item.id === payload.new.id
                ? mergeInventoryRealtimeUpdate(item, payload.new as InventoryItem)
                : item,
            )
            .sort((a, b) => a.sort_order - b.sort_order),
        );
      } else if (payload.eventType === 'DELETE') {
        setItems((prev) => prev.filter((item) => item.id !== payload.old.id));
      }
    });
  }, [subscribe]);

  const handleSaveStock = useCallback(async (id: string, value: number, isUndo = false) => {
    if (isReadOnly) {
      setSaveErrorMessage(READ_ONLY_DENY_MSG);
      return;
    }

    const currentItem = itemsRef.current.find((i) => i.id === id);
    const previousStock = Number(currentItem?.stock ?? 0);
    const priorTodayRow = todayStatusRef.current.perItem[id] ?? null;
    const tracksAccuracy = currentItem?.count_policy !== 'sufficiency_check';
    setSaveErrorMessage(null);

    // Optimistic update show the new value immediately
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, stock: value } : item)),
    );
    setSavingState('saving');

    // Register undo entry for this item (overrides any prior undo)
    if (!isUndo) {
      setUndoMap((prev) => ({ ...prev, [id]: { prevStock: previousStock } }));
    }

    const optimisticMatch = !isUndo
      ? {
          matched: isCountMatch(value, previousStock),
          systemStockQty: previousStock,
          countedQty: value,
        }
      : null;

    const optimisticDelta =
      optimisticMatch && tracksAccuracy
        ? {
            itemId: id,
            itemName: currentItem?.name,
            ...optimisticMatch,
          }
        : null;

    const undoPrior =
      isUndo && lastVerificationRef.current[id]
        ? lastVerificationRef.current[id]
        : null;

    if (!isUndo) {
      setTodayStatus((prev) =>
        applyItemTodayCount(prev, id, value, previousStock),
      );
    } else {
      setTodayStatus((prev) => removeItemTodayCount(prev, id));
    }

    if (optimisticMatch) {
      setLastVerification((prev) => ({
        ...prev,
        [id]: optimisticMatch,
      }));
    }

    if (optimisticDelta) {
      accuracyTouchedRef.current = true;
      accuracyStatsRef.current = applyCountVerificationToAccuracyStats(
        accuracyStatsRef.current,
        optimisticDelta,
      );
    } else if (undoPrior) {
      accuracyTouchedRef.current = true;
      setLastVerification((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      accuracyStatsRef.current = removeCountVerificationFromAccuracyStats(
        accuracyStatsRef.current,
        {
          itemId: id,
          countedQty: undoPrior.countedQty,
          systemStockQty: undoPrior.systemStockQty,
          matched: undoPrior.matched,
        },
      );
    }

    try {
      const verification = await recordInventoryCountAndUpdateStock(id, value, {
        clientSessionId: getClientSessionId(),
        suppressNotification: true,
        notificationContext: 'inventory_count',
        isUndo,
      } satisfies InventoryCountSaveOptions);

      if (!verification.success) {
        throw new Error(verification.error);
      }

      const countedQty = verification.countedQty ?? value;
      const systemStockQty = verification.systemStockQty ?? previousStock;
      const matched = verification.matched ?? false;
      const skipped = verification.skipped === true;

      if (isUndo) {
        // Accuracy + lastVerification already rolled back optimistically.
      } else if (skipped) {
        // Sufficiency items must not affect accuracy roll back any optimistic apply.
        if (optimisticDelta) {
          accuracyStatsRef.current = removeCountVerificationFromAccuracyStats(
            accuracyStatsRef.current,
            optimisticDelta,
          );
        }
        setLastVerification((prev) => ({
          ...prev,
          [id]: {
            matched: isCountMatch(countedQty, systemStockQty),
            systemStockQty,
            countedQty,
          },
        }));
      } else {
        const serverDelta = {
          itemId: id,
          itemName: currentItem?.name,
          countedQty,
          systemStockQty,
          matched,
        };
        setLastVerification((prev) => ({
          ...prev,
          [id]: {
            matched,
            systemStockQty,
            countedQty,
          },
        }));

        const needsReconcile =
          !optimisticDelta ||
          optimisticDelta.systemStockQty !== systemStockQty ||
          optimisticDelta.matched !== matched ||
          optimisticDelta.countedQty !== countedQty;

        if (needsReconcile) {
          accuracyTouchedRef.current = true;
          const withoutOptimistic = optimisticDelta
            ? removeCountVerificationFromAccuracyStats(
                accuracyStatsRef.current,
                optimisticDelta,
              )
            : accuracyStatsRef.current;
          accuracyStatsRef.current = applyCountVerificationToAccuracyStats(
            withoutOptimistic,
            serverDelta,
          );
        }
      }

      const savedStock = verification.newStock ?? value;
      if (savedStock !== value) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, stock: savedStock } : item)),
        );
      }

      setSavingState('synced');
      setTimeout(() => setSavingState('idle'), 2000);
    } catch (err) {
      console.error('Failed to update stock:', err);
      // Revert optimistic stock + accuracy on failure
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, stock: previousStock } : item)),
      );
      if (optimisticDelta) {
        accuracyStatsRef.current = removeCountVerificationFromAccuracyStats(
          accuracyStatsRef.current,
          optimisticDelta,
        );
      }
      if (optimisticMatch) {
        setLastVerification((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } else if (undoPrior) {
        setLastVerification((prev) => ({
          ...prev,
          [id]: undoPrior,
        }));
        accuracyStatsRef.current = applyCountVerificationToAccuracyStats(
          accuracyStatsRef.current,
          {
            itemId: id,
            itemName: currentItem?.name,
            countedQty: undoPrior.countedQty,
            systemStockQty: undoPrior.systemStockQty,
            matched: undoPrior.matched,
          },
        );
      }

      if (!isUndo) {
        if (priorTodayRow) {
          setTodayStatus((prev) =>
            applyItemTodayCount(
              prev,
              id,
              priorTodayRow.countedQty,
              priorTodayRow.systemStockQty,
              priorTodayRow.countedAt,
            ),
          );
        } else {
          setTodayStatus((prev) => removeItemTodayCount(prev, id));
        }
      } else if (priorTodayRow) {
        setTodayStatus((prev) =>
          applyItemTodayCount(
            prev,
            id,
            priorTodayRow.countedQty,
            priorTodayRow.systemStockQty,
            priorTodayRow.countedAt,
          ),
        );
      }
      // Remove undo entry since we reverted automatically
      setUndoMap((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setSavingState('idle');
      setSaveErrorMessage('บันทึกจำนวนสต็อกไม่สำเร็จ ระบบได้โหลดข้อมูลล่าสุดกลับมาแล้ว');
      fetchInventory();
    }
  }, [fetchInventory, isReadOnly]);

  // Undo the last save for a given item restores previous stock and persists it
  const handleUndo = useCallback(async (id: string) => {
    const entry = undoMap[id];
    if (!entry) return;

    // Consume the undo slot immediately
    setUndoMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    // Restore previous stock via a new save with isUndo flag active
    await handleSaveStock(id, entry.prevStock, true);
  }, [undoMap, handleSaveStock]);

  const handleAdjustStock = useCallback(async (id: string, value: number) => {
    if (isReadOnly && !adjustUnlocked) {
      setSaveErrorMessage(READ_ONLY_DENY_MSG);
      return;
    }

    const currentItem = itemsRef.current.find((i) => i.id === id);
    const previousStock = Number(currentItem?.stock ?? 0);
    setSaveErrorMessage(null);

    if (previousStock === value) {
      return;
    }

    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, stock: value } : item)),
    );
    setSavingState('saving');

    try {
      const result = await updateInventoryStock(id, value, 'Stock count page - Adjust', {
        clientSessionId: getClientSessionId(),
        suppressNotification: true,
        notificationContext: 'inventory_count',
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      const savedStock = result.newStock ?? value;
      if (savedStock !== value) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, stock: savedStock } : item)),
        );
      }

      setSavingState('synced');
      setTimeout(() => setSavingState('idle'), 2000);
    } catch (err) {
      console.error('Failed to adjust stock:', err);
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, stock: previousStock } : item)),
      );
      setSavingState('idle');
      setSaveErrorMessage('ปรับจำนวนคงเหลือไม่สำเร็จ ระบบได้โหลดข้อมูลล่าสุดกลับมาแล้ว');
      fetchInventory();
    }
  }, [adjustUnlocked, fetchInventory, isReadOnly]);

  const handleActiveChange = useCallback((id: string | null) => {
    setActiveItemId(id);
  }, []);

  const handlePageModeChange = useCallback((nextMode: CountPageMode) => {
    if (nextMode === 'adjust' && !adjustUnlocked) {
      setAdjustPinOpen(true);
      return;
    }
    setPageMode(nextMode);
    setActiveItemId(null);
    setSaveErrorMessage(null);
  }, [adjustUnlocked]);

  const handleAdjustPinSuccess = useCallback(() => {
    setCountAdjustUnlocked();
    setAdjustUnlocked(true);
    setAdjustPinOpen(false);
    setPageMode('adjust');
    setActiveItemId(null);
    setSaveErrorMessage(null);
  }, []);

  const isDimmedByActive = activeItemId !== null;

  if (loading) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center bg-background text-foreground font-normal',
        embedded ? 'min-h-[12rem]' : 'min-h-screen',
      )}>
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-foreground" strokeWidth={1.5} />
        <span className="text-sm uppercase tracking-widest text-muted-foreground font-normal">กำลังซิงค์ข้อมูลสต็อกสินค้าอยู่ค่ะ...</span>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className={cn('bg-background text-foreground font-normal', embedded ? 'p-0' : 'min-h-screen p-4 md:p-8')}>
        <div className={cn('mx-auto flex flex-col items-stretch gap-6', embedded ? 'max-w-none' : 'max-w-xl')}>
          {!embedded ? (
            <header className="flex items-center justify-between border-b border-border pb-4">
              <Link
                href={`/${locale}/inventory`}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors py-2 font-normal text-sm"
              >
                <ChevronLeft className="w-4.5 h-4.5" />
                <span>กลับไปคลังสินค้า</span>
              </Link>
            </header>
          ) : null}

          <div className="bg-card border border-red-100 dark:border-red-500/20 rounded-3xl p-6 bb-shadow-sm">
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-2xl bg-red-50 dark:bg-red-500/10 p-2.5 text-red-500">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-normal text-foreground">เปิดหน้าตรวจนับคลังสินค้าไม่สำเร็จ</h1>
                <p className="mt-1 text-sm text-muted-foreground">{errorMessage}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void fetchInventory()}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl bg-black px-4 text-sm text-white transition-colors hover:bg-black/85"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    <span>ลองเปิดใหม่</span>
                  </button>
                  {!embedded ? (
                    <Link
                      href={`/${locale}/inventory`}
                      className="inline-flex h-11 items-center rounded-2xl border border-border px-4 text-sm text-muted-foreground transition-colors hover:bg-muted"
                    >
                      กลับหน้าคลังสินค้า
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-background text-foreground font-normal', embedded ? 'p-0' : 'min-h-screen p-4 md:p-8')}>
      <div className={cn('mx-auto flex flex-col items-stretch', embedded ? 'max-w-none' : 'max-w-xl')}>

        <header className={cn(
          'flex items-center justify-between border-b border-border pb-4 mb-6',
          embedded && 'mb-4 pb-3',
        )}>
          {!embedded ? (
            <Link
              href={`/${locale}/inventory`}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors py-2 font-normal text-sm"
            >
              <ChevronLeft className="w-4.5 h-4.5" />
              <span>กลับไปคลังสินค้า</span>
            </Link>
          ) : (
            <span className="text-sm font-normal text-foreground">ตรวจนับคลังสินค้า</span>
          )}

          <div className="flex items-center gap-2 text-xs font-normal">
            {savingState === 'saving' && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>กำลังบันทึกข้อมูลอยู่นะคะ</span>
              </span>
            )}
            {savingState === 'synced' && (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="w-3 h-3" />
                <span>บันทึกข้อมูลเรียบร้อยแล้วค่ะ</span>
              </span>
            )}
            {savingState === 'idle' && (
              <span className="text-muted-foreground/60">เชื่อมต่อคลังสินค้าเรียบเสร็จสมบูรณ์ค่ะ</span>
            )}
          </div>
        </header>

        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-foreground text-background rounded-2xl shrink-0 bb-shadow-md">
              <ClipboardList className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 text-left">
              <h1 className="bb-page-title">ตรวจนับคลังสินค้า</h1>
              <p className="text-sm text-muted-foreground">
                {pageMode === 'count'
                  ? 'กรอกจำนวนที่นับได้ แล้วกด Enter เพื่อบันทึก'
                  : 'กรอกจำนวนคงเหลือใหม่ แล้วกด Enter เพื่อปรับ'}
              </p>
            </div>
          </div>
        </div>

        <CountPageTabSwitcher mode={pageMode} onChange={handlePageModeChange} />

        <CountAdjustPinDialog
          open={adjustPinOpen}
          onCancel={() => setAdjustPinOpen(false)}
          onSuccess={handleAdjustPinSuccess}
        />

        {pageMode === 'count' && <TodayCountSessionBanner status={todayStatus} />}

        {saveErrorMessage && (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {saveErrorMessage}
          </div>
        )}

        <div className="space-y-2.5 pb-20 bb-smooth-scroll">
          {items.length === 0 ? (
            <div className="p-8 text-center text-base font-normal text-muted-foreground bg-card border border-border rounded-3xl">
              ไม่มีข้อมูลสินค้าในระบบ กรุณาเพิ่มข้อมูลในหน้าคลังสินค้าหลักก่อนนะคะ
            </div>
          ) : pageMode === 'count' ? (
            items.map((item, index) => (
              <CountItemRow
                key={item.id}
                item={item}
                index={index}
                isActive={activeItemId === item.id}
                isDimmed={isDimmedByActive && activeItemId !== item.id}
                animateEntrance={animateEntrance}
                recentVerification={lastVerification[item.id]}
                todayCount={todayStatus.perItem[item.id]}
                undoEntry={undoMap[item.id]}
                onSave={handleSaveStock}
                onUndo={handleUndo}
                isReadOnly={isReadOnly}
                onActiveChange={handleActiveChange}
              />
            ))
          ) : (
            items.map((item, index) => (
              <AdjustItemRow
                key={item.id}
                item={item}
                index={index}
                isActive={activeItemId === item.id}
                isDimmed={isDimmedByActive && activeItemId !== item.id}
                animateEntrance={animateEntrance}
                onSave={handleAdjustStock}
                isReadOnly={isReadOnly && !adjustUnlocked}
                onActiveChange={handleActiveChange}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
