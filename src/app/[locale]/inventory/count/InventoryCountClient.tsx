'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Loader2, CheckCircle2, ClipboardList, AlertCircle, RefreshCcw, Undo2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { fetchCountAccuracyStats, recordInventoryCountAndUpdateStock } from '@/app/actions/inventory-actions';
import type {
  CountAccuracyStatsResult,
  InventoryCountSaveOptions,
  ItemCountAccuracyStats,
} from '@/app/actions/inventory-actions';
import { useInventoryRealtime } from '@/contexts/InventoryRealtimeContext';
import { getClientSessionId } from '@/lib/client-session';
import { mergeInventoryRealtimeUpdate } from '@/lib/inventory-stock';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import { INVENTORY_COUNT_SELECT } from '@/lib/inventory-queries';
import { useReadOnly, READ_ONLY_DENY_MSG } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils';
import { PASTEL_SURFACE } from '@/lib/shift-colors';

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
  prevStock: number; // The value before the last save — can be restored once
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
}: {
  index: number;
  onSave: (id: string, value: number) => Promise<void>;
  disabled?: boolean;
  isActive?: boolean;
  onActiveChange?: (id: string | null) => void;
  itemId: string;
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
    try {
      await onSave(itemId, sanitized);
      return true;
    } finally {
      isSavingRef.current = false;
      committingRef.current = false;
    }
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
        value={val}
        placeholder="จำนวน"
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
          'px-3 rounded-xl border text-base font-normal text-center outline-none tabular-nums transition-all duration-200 placeholder:text-muted-foreground/40',
          isActive
            ? 'w-28 h-11 border-black/20 bg-white text-black ring-2 ring-black/10 shadow-sm bb-pastel-surface'
            : 'w-24 h-10 border-border bg-muted text-foreground focus:bg-card focus:ring-1 focus:ring-foreground/10',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      />
      <AnimatePresence>
        {isActive && val.length > 0 && (
          <motion.span
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.12 }}
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

type CountItemRowProps = {
  item: InventoryItem;
  index: number;
  isActive: boolean;
  isDimmed: boolean;
  animateEntrance: boolean;
  itemStats?: ItemCountAccuracyStats;
  recentVerification?: { matched: boolean; systemStockQty: number; countedQty: number };
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
  itemStats,
  recentVerification,
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
      initial={animateEntrance ? { opacity: 0, y: 10 } : false}
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
        'relative rounded-2xl p-4 flex items-start justify-between gap-3 transition-all duration-300',
        rowToneClass,
        isActive
          ? 'shadow-md ring-2 ring-black/8 z-10'
          : 'shadow-sm hover:ring-1 hover:ring-black/5',
      )}
    >
      {isActive && (
        <div className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-black/70" />
      )}

      <div className="flex items-start gap-3 flex-1 min-w-0 pl-1">
        <span
          className={cn(
            'text-[12px] font-normal tabular-nums shrink-0 rounded-lg px-2 py-0.5 transition-all duration-200',
            isActive
              ? 'bg-black text-white'
              : 'bg-white/60 text-black/55'
          )}
        >
          {(index + 1).toString().padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <span
            className={cn(
              'font-normal text-[15px] leading-tight transition-colors duration-200 block',
              'text-black'
            )}
          >
            {item.name} {item.unit ? `(${item.unit})` : ''}
          </span>
          <p className="mt-1 text-xs font-normal text-black/70 bb-pastel-surface">
            {isSufficiencyCheck ? 'ประเภท: ไม่ต้องเบิก' : 'ประเภท: ต้องเบิก'}
          </p>
          {!isSufficiencyCheck && (
            itemStats && itemStats.totalChecks > 0 ? (
              <p className="mt-1 text-xs tabular-nums text-black/70 bb-pastel-surface">
                ค่าความแม่นยำ: {itemStats.accuracyPct}%
                <span className="opacity-70"> (คลาดเคลื่อนรวม {itemStats.totalDiscrepancyQty} หน่วย)</span>
              </p>
            ) : (
              <p className="mt-1 text-xs text-black/50 bb-pastel-surface">
                ค่าความแม่นยำ: ยังไม่มีข้อมูล
              </p>
            )
          )}
          {recentVerification && !isSufficiencyCheck && (
            <p
              className={cn(
                'mt-1 text-xs rounded-lg px-2 py-0.5 inline-block bb-pastel-surface',
                recentVerification.matched
                  ? 'bg-[#d4edda] text-black border border-[#c3e6cb]'
                  : 'bg-[#fff3cd] text-black border border-[#ffeeba]',
              )}
            >
              {recentVerification.matched
                ? '✓ ตรงครั้งนี้'
                : `✗ ไม่ตรง (นับได้ ${recentVerification.countedQty}, ในระบบ: ${recentVerification.systemStockQty})`}
            </p>
          )}
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
        {/* 1-time undo button per item — shown after a save, while undoEntry exists */}
        <AnimatePresence>
          {undoEntry && !isReadOnly && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={() => onUndo(item.id)}
              className="flex items-center gap-1 rounded-xl border border-black/15 bg-white/80 bb-pastel-surface px-2.5 py-1 text-[11px] text-black/60 shadow-sm hover:bg-white hover:text-black transition-all"
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

interface InventoryCountClientProps {
  initialItems: InventoryItem[];
  initialAccuracyStats?: CountAccuracyStatsResult | null;
  locale: string;
}

export default function InventoryCountClient({
  initialItems,
  initialAccuracyStats = null,
  locale,
}: InventoryCountClientProps) {
  const isReadOnly = useReadOnly();
  const { subscribe } = useInventoryRealtime();

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
  const [accuracyStats, setAccuracyStats] = useState<CountAccuracyStatsResult | null>(initialAccuracyStats);
  const [lastVerification, setLastVerification] = useState<Record<string, { matched: boolean; systemStockQty: number; countedQty: number }>>({});
  // Per-item undo state: maps itemId → UndoEntry. Cleared after one use.
  const [undoMap, setUndoMap] = useState<Record<string, UndoEntry>>({});
  const [animateEntrance] = useState(
    () => initialItems.length <= STAGGER_ANIMATION_CAP,
  );

  const loadAccuracyStats = useCallback(async () => {
    const res = await fetchCountAccuracyStats();
    if (res.success && res.data) {
      setAccuracyStats(res.data);
    }
  }, []);

  useEffect(() => {
    if (initialAccuracyStats) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch accuracy stats on mount when not server-provided
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
    setSaveErrorMessage(null);

    // Optimistic update — show the new value immediately
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, stock: value } : item)),
    );
    setSavingState('saving');

    // Register undo entry for this item (overrides any prior undo)
    if (!isUndo) {
      setUndoMap((prev) => ({ ...prev, [id]: { prevStock: previousStock } }));
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

      if (isUndo) {
        setLastVerification((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } else {
        setLastVerification((prev) => ({
          ...prev,
          [id]: {
            matched: verification.matched ?? false,
            systemStockQty: verification.systemStockQty ?? previousStock,
            countedQty: verification.countedQty ?? value,
          },
        }));
      }
      void loadAccuracyStats();

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
      // Revert optimistic update on failure
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, stock: previousStock } : item)),
      );
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
  }, [fetchInventory, isReadOnly, loadAccuracyStats]);

  // Undo the last save for a given item — restores previous stock and persists it
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

  const handleActiveChange = useCallback((id: string | null) => {
    setActiveItemId(id);
  }, []);

  const isDimmedByActive = activeItemId !== null;

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground font-normal">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-foreground" strokeWidth={1.5} />
        <span className="text-sm uppercase tracking-widest text-muted-foreground font-normal">กำลังซิงค์ข้อมูลสต็อกสินค้าอยู่ค่ะ...</span>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-background text-foreground font-normal p-4 md:p-8">
        <div className="max-w-xl mx-auto flex flex-col items-stretch gap-6">
          <header className="flex items-center justify-between border-b border-border pb-4">
            <Link
              href={`/${locale}/inventory`}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors py-2 font-normal text-sm"
            >
              <ChevronLeft className="w-4.5 h-4.5" />
              <span>กลับไปคลังสินค้า</span>
            </Link>
          </header>

          <div className="bg-card border border-red-100 dark:border-red-500/20 rounded-3xl p-6 shadow-sm">
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
                  <Link
                    href={`/${locale}/inventory`}
                    className="inline-flex h-11 items-center rounded-2xl border border-border px-4 text-sm text-muted-foreground transition-colors hover:bg-muted"
                  >
                    กลับหน้าคลังสินค้า
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-normal p-4 md:p-8">
      <div className="max-w-xl mx-auto flex flex-col items-stretch">

        <header className="flex items-center justify-between border-b border-border pb-4 mb-6">
          <Link
            href={`/${locale}/inventory`}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors py-2 font-normal text-sm"
          >
            <ChevronLeft className="w-4.5 h-4.5" />
            <span>กลับไปคลังสินค้า</span>
          </Link>

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

        <div className="flex flex-col items-center mb-6 text-center">
          <div className="p-2.5 bg-black text-white rounded-2xl mb-4 shrink-0 shadow-md">
            <ClipboardList className="w-7 h-7" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-normal tracking-widest uppercase text-foreground">
            ตรวจนับคลังสินค้า
          </h1>
          <p className="text-muted-foreground text-[11px] font-normal uppercase tracking-[0.2em] mt-1.5">
            บันทึกการตรวจนับ
          </p>
          <p className="text-muted-foreground/60 text-[10px] font-normal mt-1">
            กรอกจำนวนที่นับได้ แล้วกด Enter เพื่อยืนยัน
          </p>
        </div>

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
          ) : (
            items.map((item, index) => (
              <CountItemRow
                key={item.id}
                item={item}
                index={index}
                isActive={activeItemId === item.id}
                isDimmed={isDimmedByActive && activeItemId !== item.id}
                animateEntrance={animateEntrance}
                itemStats={accuracyStats?.perItem[item.id]}
                recentVerification={lastVerification[item.id]}
                undoEntry={undoMap[item.id]}
                onSave={handleSaveStock}
                onUndo={handleUndo}
                isReadOnly={isReadOnly}
                onActiveChange={handleActiveChange}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
