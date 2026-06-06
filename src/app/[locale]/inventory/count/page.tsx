'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Loader2, CheckCircle2, ClipboardList, AlertCircle, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { updateInventoryStock } from '@/app/actions/inventory-actions';
import { mergeInventoryRealtimeUpdate } from '@/lib/inventory-stock';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import { useReadOnly, READ_ONLY_DENY_MSG } from '@/components/providers/AuthProvider';

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
}: {
  item: InventoryItem;
  index: number;
  onSave: (id: string, value: number) => Promise<void>;
  disabled?: boolean;
}) {
  const [val, setVal] = useState(item.stock === 0 ? '' : String(item.stock));
  const [isFocused, setIsFocused] = useState(false);
  const pendingValueRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      if (pendingValueRef.current !== null && Number(item.stock) === pendingValueRef.current) {
        pendingValueRef.current = null;
      }
      if (pendingValueRef.current === null) {
        setVal(item.stock === 0 ? '' : String(item.stock));
      }
    }
  }, [item.stock, isFocused]);

  const handleBlur = async () => {
    if (disabled) return;
    const numberVal = val === '' ? 0 : Number(val);
    const sanitized = isNaN(numberVal) ? 0 : numberVal;
    pendingValueRef.current = sanitized;
    setIsFocused(false);
    await onSave(item.id, sanitized);
  };

  return (
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
      onFocus={() => setIsFocused(true)}
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
      className={`w-24 h-10 px-3 rounded-xl border border-black/10 bg-slate-50 text-base font-normal text-center focus:bg-white focus:outline-none focus:ring-1 focus:ring-black/10 text-black font-mono transition-all ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
    />
  );
}

export default function InventoryCountPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'th';
  const isReadOnly = useReadOnly();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'synced'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      await ensureSupabaseSession();
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, stock, unit, sort_order')
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
    fetchInventory();

    const channel = supabase
      .channel('inventory_count_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setItems(prev => {
            if (prev.find(i => i.id === payload.new.id)) return prev;
            return [...prev, payload.new as InventoryItem].sort((a, b) => a.sort_order - b.sort_order);
          });
        } else if (payload.eventType === 'UPDATE') {
          setItems(prev => prev.map(item =>
            item.id === payload.new.id
              ? mergeInventoryRealtimeUpdate(item, payload.new as InventoryItem)
              : item
          ).sort((a, b) => a.sort_order - b.sort_order));
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(item => item.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInventory]);

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
      const result = await updateInventoryStock(id, value, 'Stock-taking count');

      if (!result.success) {
        throw new Error(result.error);
      }

      const savedStock = result.newStock ?? value;
      setItems(prev => prev.map(item =>
        item.id === id ? { ...item, stock: savedStock } : item
      ));

      setSavingState('synced');
      setTimeout(() => setSavingState('idle'), 2000);
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fdfcf0] text-black font-normal">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-black" strokeWidth={1.5} />
        <span className="text-sm uppercase tracking-widest text-black/60 font-normal">กำลังซิงค์ข้อมูลสต็อกสินค้าอยู่ค่ะ...</span>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-[#fdfcf0] text-black font-normal p-4 md:p-8">
        <div className="max-w-xl mx-auto flex flex-col items-stretch gap-6">
          <header className="flex items-center justify-between border-b border-black/5 pb-4">
            <Link
              href={`/${locale}/inventory`}
              className="flex items-center gap-1.5 text-black/50 hover:text-black transition-colors py-2 font-normal text-sm"
            >
              <ChevronLeft className="w-4.5 h-4.5" />
              <span>กลับไปคลังสินค้า</span>
            </Link>
          </header>

          <div className="bg-white border border-red-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-2xl bg-red-50 p-2.5 text-red-500">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-normal text-black">เปิดหน้าตรวจนับคลังสินค้าไม่สำเร็จ</h1>
                <p className="mt-1 text-sm text-black/60">{errorMessage}</p>
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
                    className="inline-flex h-11 items-center rounded-2xl border border-black/10 px-4 text-sm text-black/70 transition-colors hover:bg-black/[0.03]"
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
    <div className="min-h-screen bg-[#fdfcf0] text-black font-normal p-4 md:p-8">
      <div className="max-w-xl mx-auto flex flex-col items-stretch">

        <header className="flex items-center justify-between border-b border-black/5 pb-4 mb-6">
          <Link
            href={`/${locale}/inventory`}
            className="flex items-center gap-1.5 text-black/50 hover:text-black transition-colors py-2 font-normal text-sm"
          >
            <ChevronLeft className="w-4.5 h-4.5" />
            <span>กลับไปคลังสินค้า</span>
          </Link>

          <div className="flex items-center gap-2 text-xs font-normal">
            {savingState === 'saving' && (
              <span className="flex items-center gap-1 text-black/60">
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
              <span className="text-black/30">เชื่อมต่อคลังสินค้าเรียบเสร็จสมบูรณ์ค่ะ</span>
            )}
          </div>
        </header>

        <div className="flex flex-col items-center mb-8 text-center">
          <div className="p-2.5 bg-black text-white rounded-2xl mb-4 shrink-0 shadow-md">
            <ClipboardList className="w-7 h-7" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-normal tracking-widest uppercase text-black">
            ตรวจนับคลังสินค้า
          </h1>
          <p className="text-[#000000]/40 text-[11px] font-normal uppercase tracking-[0.2em] mt-1.5">
            บันทึกการตรวจนับ
          </p>
        </div>

        {saveErrorMessage && (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {saveErrorMessage}
          </div>
        )}

        <div className="space-y-2.5 pb-20">
          {items.length === 0 ? (
            <div className="p-8 text-center text-base font-normal text-black/40 bg-white border border-black/5 rounded-3xl">
              ไม่มีข้อมูลสินค้าในระบบ กรุณาเพิ่มข้อมูลในหน้าคลังสินค้าหลักก่อนนะคะ
            </div>
          ) : (
            items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                className="bg-white border border-black/[0.05] rounded-2xl p-4 flex items-start justify-between shadow-sm hover:border-black/10 transition-all duration-300"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0 mr-4">
                  <span className="text-[12px] font-normal text-black/25 font-mono shrink-0">
                    {(index + 1).toString().padStart(2, '0')}
                  </span>
                  <span className="text-black font-normal text-[15px] leading-tight">
                    {item.name} {item.unit ? `(${item.unit})` : ''}
                  </span>
                </div>

                <div className="shrink-0">
                  <CountInput
                    item={item}
                    index={index}
                    onSave={handleSaveStock}
                    disabled={isReadOnly}
                  />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
