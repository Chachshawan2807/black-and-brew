'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Loader2, CheckCircle2, ClipboardList, AlertCircle, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { updateInventoryStock, fetchCountAccuracyStats, recordCountVerification, fetchInOutTheoreticalQtyMap } from '@/app/actions/inventory-actions';
import type { CountAccuracyStatsResult, ItemCountAccuracyStats } from '@/app/actions/inventory-actions';
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
  [key: string]: any;
}

function CountInput({
  item,
  index,
  onSave,
  disabled = false,
  isActive = false,
  onActiveChange,
}: {
  item: InventoryItem;
  index: number;
  onSave: (id: string, value: number) => Promise<void>;
  disabled?: boolean;
  isActive?: boolean;
  onActiveChange?: (id: string | null) => void;
}) {
  const [val, setVal] = useState(String(item.stock ?? 0));
  const [isFocused, setIsFocused] = useState(false);
  const pendingValueRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      if (pendingValueRef.current !== null && Number(item.stock) === pendingValueRef.current) {
        pendingValueRef.current = null;
      }
      if (pendingValueRef.current === null) {
        setVal(String(item.stock ?? 0));
      }
    }
  }, [item.stock, isFocused]);

  const handleBlur = async () => {
    if (disabled) return;
    const numberVal = val === '' ? 0 : Number(val);
    const sanitized = isNaN(numberVal) ? 0 : numberVal;
    pendingValueRef.current = sanitized;
    setVal(String(sanitized));
    setIsFocused(false);
    onActiveChange?.(null);
    await onSave(item.id, sanitized);
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <AnimatePresence>
        {isActive && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="text-[10px] font-normal uppercase tracking-[0.15em] text-black/45 pr-1 bb-pastel-surface"
          >
            จำนวนคงเหลือ
          </motion.span>
        )}
      </AnimatePresence>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={val}
        onChange={(e) => {
          let value = e.target.value.replace(/[^0-9.]/g, '');
          if (value.length > 1 && value.startsWith('0') && !value.startsWith('0.')) {
            value = value.replace(/^0+/, '');
          }
          setVal(value);
        }}
        onFocus={() => {
          setIsFocused(true);
          onActiveChange?.(item.id);
          inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }}
        onBlur={() => void handleBlur()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
            const nextInput = document.querySelector(`input[data-count-row-index="${index + 1}"]`) as HTMLInputElement;
            if (nextInput) {
              setTimeout(() => {
                nextInput.focus();
                nextInput.select();
              }, 10);
            }
          }
        }}
        data-count-row-index={index}
        disabled={disabled}
        className={cn(
          'px-3 rounded-xl border text-base font-normal text-center outline-none font-mono transition-all duration-200',
          isActive
            ? 'w-28 h-11 border-black/20 bg-white text-black ring-2 ring-black/10 shadow-sm bb-pastel-surface'
            : 'w-24 h-10 border-border bg-muted text-foreground focus:bg-card focus:ring-1 focus:ring-foreground/10',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      />
    </div>
  );
}

interface InventoryCountClientProps {
  initialItems: InventoryItem[];
  locale: string;
}

export default function InventoryCountClient({ initialItems, locale }: InventoryCountClientProps) {
  const isReadOnly = useReadOnly();
  const { subscribe } = useInventoryRealtime();

  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'synced'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [accuracyStats, setAccuracyStats] = useState<CountAccuracyStatsResult | null>(null);
  const [theoreticalByItem, setTheoreticalByItem] = useState<Record<string, number>>({});
  const [lastVerification, setLastVerification] = useState<Record<string, { matched: boolean; theoreticalQty: number; countedQty: number }>>({});

  const loadAccuracyStats = useCallback(async () => {
    const res = await fetchCountAccuracyStats();
    if (res.success && res.data) {
      setAccuracyStats(res.data);
    }
  }, []);

  const loadTheoreticalQtyForItems = useCallback(async (itemList: InventoryItem[]) => {
    const res = await fetchInOutTheoreticalQtyMap(itemList.map((item) => item.id));
    if (res.success && res.data) {
      setTheoreticalByItem(res.data);
    }
  }, []);

  useEffect(() => {
    void loadAccuracyStats();
    void loadTheoreticalQtyForItems(initialItems);
  }, [loadAccuracyStats, loadTheoreticalQtyForItems, initialItems]);

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
      void loadTheoreticalQtyForItems(data || []);
    } catch (err) {
      console.error('Failed to load inventory for count:', err);
      setItems([]);
      setErrorMessage('ไม่สามารถเปิดหน้าตรวจนับคลังสินค้าได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }, [loadTheoreticalQtyForItems]);

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

  async function handleSaveStock(id: string, value: number) {
    if (isReadOnly) {
      setSaveErrorMessage(READ_ONLY_DENY_MSG);
      return;
    }
    const currentItem = items.find(i => i.id === id);
    if (currentItem && Number(currentItem.stock) === value) return;

    const previousStock = currentItem?.stock ?? 0;

    // Optimistic UI update
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, stock: value } : item
    ));

    setSavingState('saving');
    setSaveErrorMessage(null);

    try {
      const result = await updateInventoryStock(id, value, 'Stock-taking count', {
        recordHistory: false,
        clientSessionId: getClientSessionId(),
        notificationContext: 'inventory_count',
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      const savedStock = result.newStock ?? value;
      setItems(prev => prev.map(item =>
        item.id === id ? { ...item, stock: savedStock } : item
      ));

      setSavingState('synced');
      setTimeout(() => setSavingState('idle'), 2000);

      const verification = await recordCountVerification(id, savedStock);
      if (verification.success) {
        setLastVerification((prev) => ({
          ...prev,
          [id]: {
            matched: verification.matched ?? false,
            theoreticalQty: verification.theoreticalQty ?? 0,
            countedQty: verification.countedQty ?? savedStock,
          },
        }));
        if (verification.theoreticalQty !== undefined) {
          setTheoreticalByItem((prev) => ({ ...prev, [id]: verification.theoreticalQty! }));
        }
        await loadAccuracyStats();
      }
    } catch (err) {
      console.error('Failed to update stock:', err);
      setItems(prev => prev.map(item =>
        item.id === id ? { ...item, stock: previousStock } : item
      ));
      setSavingState('idle');
      setSaveErrorMessage('บันทึกจำนวนสต็อกไม่สำเร็จ ระบบได้โหลดข้อมูลล่าสุดกลับมาแล้ว');
      fetchInventory();
    }
  }

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
        </div>

        <div className="mb-6 rounded-2xl border border-border bg-card p-4 text-center shadow-sm">
          <p className="text-[11px] font-normal uppercase tracking-[0.2em] text-muted-foreground">
            ความแม่นยำการบันทึกรับเข้า/นำออก
          </p>
          {accuracyStats && accuracyStats.overall.totalChecks > 0 ? (
            <>
              <p className="mt-2 text-3xl font-normal tabular-nums text-foreground">
                {accuracyStats.overall.accuracyPct}%
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                ตรง {accuracyStats.overall.matchChecks} จาก {accuracyStats.overall.totalChecks} ครั้งที่ตรวจนับ (ไม่รวมการปรับจำนวน)
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">ยังไม่มีข้อมูลการตรวจนับ</p>
          )}
        </div>

        {saveErrorMessage && (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {saveErrorMessage}
          </div>
        )}

        <div className="space-y-2.5 pb-20">
          {items.length === 0 ? (
            <div className="p-8 text-center text-base font-normal text-muted-foreground bg-card border border-border rounded-3xl">
              ไม่มีข้อมูลสินค้าในระบบ กรุณาเพิ่มข้อมูลในหน้าคลังสินค้าหลักก่อนนะคะ
            </div>
          ) : (
            items.map((item, index) => {
              const isActive = activeItemId === item.id;
              const isDimmed = activeItemId !== null && !isActive;
              const itemStats: ItemCountAccuracyStats | undefined = accuracyStats?.perItem[item.id];
              const theoreticalQty = theoreticalByItem[item.id];
              const recentVerification = lastVerification[item.id];

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: isDimmed ? 0.42 : 1,
                    y: 0,
                    scale: isActive ? 1.015 : 1,
                  }}
                  transition={{ duration: 0.2, delay: activeItemId ? 0 : index * 0.02 }}
                  className={cn(
                    'relative rounded-2xl p-4 flex items-start justify-between gap-3 transition-all duration-300',
                    isActive
                      ? `${PASTEL_SURFACE} bg-[#d4edda] border border-[#c3e6cb] shadow-md ring-2 ring-black/8 z-10`
                      : 'bg-card border border-border shadow-sm hover:border-foreground/10',
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-black/70" />
                  )}

                  <div className="flex items-start gap-3 flex-1 min-w-0 pl-1">
                    <span
                      className={cn(
                        'text-[12px] font-normal font-mono shrink-0 rounded-lg px-2 py-0.5 transition-all duration-200 tabular-nums',
                        isActive
                          ? 'bg-black text-white'
                          : 'text-muted-foreground/50'
                      )}
                    >
                      {(index + 1).toString().padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'font-normal text-[15px] leading-tight transition-colors duration-200 block',
                          isActive ? 'text-black' : 'text-foreground/80'
                        )}
                      >
                        {item.name} {item.unit ? `(${item.unit})` : ''}
                      </span>
                      {theoreticalQty !== undefined && (
                        <p className={cn('mt-1 text-xs tabular-nums', isActive ? 'text-black/70 bb-pastel-surface' : 'text-muted-foreground')}>
                          ตามบันทึก IN/OUT: {theoreticalQty}
                        </p>
                      )}
                      {itemStats && itemStats.totalChecks > 0 ? (
                        <p className={cn('mt-0.5 text-xs tabular-nums', isActive ? 'text-black/70 bb-pastel-surface' : 'text-muted-foreground')}>
                          ความแม่นยำ {itemStats.accuracyPct}% ({itemStats.matchChecks}/{itemStats.totalChecks})
                        </p>
                      ) : (
                        <p className={cn('mt-0.5 text-xs', isActive ? 'text-black/50 bb-pastel-surface' : 'text-muted-foreground/70')}>
                          ยังไม่มีข้อมูลการตรวจนับ
                        </p>
                      )}
                      {recentVerification && (
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
                            : `✗ ไม่ตรง (นับได้ ${recentVerification.countedQty}, บันทึก IN/OUT: ${recentVerification.theoreticalQty})`}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <CountInput
                      item={item}
                      index={index}
                      onSave={handleSaveStock}
                      disabled={isReadOnly}
                      isActive={isActive}
                      onActiveChange={setActiveItemId}
                    />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
