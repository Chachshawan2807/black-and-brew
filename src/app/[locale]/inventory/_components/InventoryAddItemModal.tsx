'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fadeOverlay, modalContent } from '@/lib/motion-presets';
import { X } from 'lucide-react';
import {
  getModalBackdropKeyboardAwareStyle,
  getModalContentKeyboardAwareStyle,
} from '@/lib/keyboard-aware-panel-style';
import { useVisualViewportInsets } from '@/hooks/use-visual-viewport-insets';
import { supabase } from '@/lib/supabase';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import { logClientDataChange } from '@/lib/client-data-change-log';
import { recordItemAddHistory } from '@/app/actions/inventory-actions';
import { HintTooltip } from '@/components/ui/hint-tooltip';

export type NewInventoryItemInput = {
  name: string;
  stock: number;
  order_qty: number;
  order_point: number;
  target_stock: number;
  unit: string;
  source: string;
  sort_order: number;
};

type InventoryAddItemModalProps = {
  itemsCount: number;
  onClose: () => void;
  onSuccess: (item: { id: string } & NewInventoryItemInput) => void;
};

export function InventoryAddItemModal({ itemsCount, onClose, onSuccess }: InventoryAddItemModalProps) {
  const [newItemData, setNewItemData] = useState<Record<string, string | number>>({});
  const [insertPosition, setInsertPosition] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const viewportInsets = useVisualViewportInsets(isMounted);
  const modalBackdropStyle = getModalBackdropKeyboardAwareStyle({ insets: viewportInsets });
  const modalContentStyle = getModalContentKeyboardAwareStyle({ insets: viewportInsets });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional client-only mount gate
    setIsMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const rawPos = insertPosition === '' ? itemsCount + 1 : Number(insertPosition);
    const insertPos = Number.isNaN(rawPos) ? itemsCount + 1 : Math.max(1, Math.min(itemsCount + 1, rawPos));
    const isAppend = insertPos >= itemsCount + 1;

    const newItem: NewInventoryItemInput = {
      name: String(newItemData.name || ''),
      stock: newItemData.stock === '' || newItemData.stock === undefined ? 0 : Number(newItemData.stock),
      order_qty: 0,
      order_point: newItemData.order_point === '' || newItemData.order_point === undefined ? 0 : Number(newItemData.order_point),
      target_stock: newItemData.target_stock === '' || newItemData.target_stock === undefined ? 0 : Number(newItemData.target_stock),
      unit: String(newItemData.unit || ''),
      source: String(newItemData.source || ''),
      sort_order: insertPos,
    };

    setIsSubmitting(true);
    try {
      await ensureSupabaseSession();

      const dbNewItem = { ...newItem };
      if (isAppend) {
        const { data: maxOrderData, error: maxOrderErr } = await supabase
          .from('inventory_items')
          .select('sort_order')
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (maxOrderErr) {
          console.error('Supabase Error:', maxOrderErr.message, maxOrderErr.details);
          throw maxOrderErr;
        }

        dbNewItem.sort_order = maxOrderData ? (maxOrderData.sort_order || 0) + 1 : insertPos;
      }

      const { data, error } = await supabase.from('inventory_items').insert([dbNewItem]).select().single();

      if (error) {
        console.error('Supabase Error:', error.message, error.details);
        throw error;
      }

      logClientDataChange({
        action: 'CREATE',
        module: 'inventory',
        entityType: 'inventory_item',
        entityId: data.id,
        entityLabel: data.name,
        after: data,
      });

      const historyRes = await recordItemAddHistory(data.id, Number(data.stock ?? 0), data.name);
      if (!historyRes.success) {
        console.error('[InventoryAddItemModal] recordItemAddHistory:', historyRes.error);
      }

      onSuccess(data);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Failed to add item:', message);
      alert('ไม่สามารถเพิ่มรายการได้: ' + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={fadeOverlay.initial}
      animate={fadeOverlay.animate}
      exit={fadeOverlay.exit}
      transition={fadeOverlay.transition}
      className="fixed inset-0 z-[210] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 transition-[padding,height] duration-200"
      style={modalBackdropStyle}
      onClick={onClose}
    >
      <motion.div
        initial={modalContent.initial}
        animate={modalContent.animate}
        exit={modalContent.exit}
        transition={modalContent.transition}
        className="relative bg-card border border-border rounded-3xl bb-shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden transition-[max-height] duration-200"
        style={modalContentStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <HintTooltip tip="ปิด">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors z-10"
            aria-label="ปิด"
          >
            <X className="w-5 h-5" />
          </button>
        </HintTooltip>
        <div className="px-6 h-14 border-b border-border flex items-center justify-between shrink-0 pr-14">
          <h2 className="text-lg font-normal text-foreground">เพิ่มรายการใหม่</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto bb-smooth-scroll flex-1 min-h-0">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-[12px] font-normal text-muted-foreground ml-1 uppercase tracking-wider">ชื่อรายการ</label>
              <input
                required
                value={newItemData.name ?? ''}
                onChange={(e) => setNewItemData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full h-11 px-4 bg-background border border-border focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 rounded-3xl text-base md:text-sm font-normal text-foreground outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-normal text-muted-foreground ml-1">คงเหลือ</label>
              <input
                type="text"
                inputMode="decimal"
                value={
                  newItemData.stock === undefined || newItemData.stock === null || newItemData.stock === ''
                    ? ''
                    : String(newItemData.stock)
                }
                onChange={(e) => {
                  let val = e.target.value.replace(/[^0-9.]/g, '');
                  if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) val = val.replace(/^0+/, '');
                  setNewItemData((prev) => ({ ...prev, stock: val }));
                }}
                className="w-full h-11 px-4 bg-muted border border-border focus:border-foreground/20 rounded-3xl text-base md:text-sm font-normal text-foreground outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-normal text-muted-foreground ml-1">หน่วย</label>
              <input
                value={newItemData.unit ?? ''}
                onChange={(e) => setNewItemData((prev) => ({ ...prev, unit: e.target.value }))}
                className="w-full h-11 px-4 bg-muted border border-border focus:border-foreground/20 rounded-3xl text-base md:text-sm font-normal text-foreground outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-normal text-muted-foreground ml-1">จุดสั่งซื้อ</label>
              <input
                type="text"
                inputMode="decimal"
                value={
                  newItemData.order_point === undefined || newItemData.order_point === null || newItemData.order_point === ''
                    ? ''
                    : String(newItemData.order_point)
                }
                onChange={(e) => {
                  let val = e.target.value.replace(/[^0-9.]/g, '');
                  if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) val = val.replace(/^0+/, '');
                  setNewItemData((prev) => ({ ...prev, order_point: val }));
                }}
                className="w-full h-11 px-4 bg-muted border border-border focus:border-foreground/20 rounded-3xl text-base md:text-sm font-normal text-foreground outline-none transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-normal text-muted-foreground ml-1">จำนวนที่ต้องมี</label>
              <input
                type="text"
                inputMode="decimal"
                value={
                  newItemData.target_stock === undefined || newItemData.target_stock === null || newItemData.target_stock === ''
                    ? ''
                    : String(newItemData.target_stock)
                }
                onChange={(e) => {
                  let val = e.target.value.replace(/[^0-9.]/g, '');
                  if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) val = val.replace(/^0+/, '');
                  setNewItemData((prev) => ({ ...prev, target_stock: val }));
                }}
                className="w-full h-11 px-4 bg-muted border border-border focus:border-foreground/20 rounded-3xl text-base md:text-sm font-normal text-foreground outline-none transition-all"
              />
            </div>

            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-[12px] font-normal text-muted-foreground ml-1">ช่องทางสั่งซื้อ</label>
              <input
                value={newItemData.source ?? ''}
                onChange={(e) => setNewItemData((prev) => ({ ...prev, source: e.target.value }))}
                className="w-full h-11 px-4 bg-muted border border-border focus:border-foreground/20 rounded-3xl text-base md:text-sm font-normal text-foreground outline-none transition-all"
              />
            </div>

            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-[12px] font-normal text-muted-foreground ml-1 flex items-center gap-1">
                แทรกที่ลำดับ
                <span className="text-muted-foreground/70">(ค่าเริ่มต้น: ท้ายสุด = {itemsCount + 1})</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder={String(itemsCount + 1)}
                value={insertPosition}
                onChange={(e) => {
                  let v = e.target.value.replace(/[^0-9]/g, '');
                  v = v.replace(/^0+(?=\d)/, '');
                  setInsertPosition(v);
                }}
                className="w-full h-11 px-4 bg-muted border border-border focus:border-foreground/20 rounded-3xl text-base md:text-sm font-normal text-foreground outline-none transition-all"
              />
            </div>
          </div>
          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-muted hover:bg-muted/80 border border-border rounded-3xl text-[14px] font-normal text-foreground transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-foreground hover:opacity-90 rounded-3xl text-[14px] font-normal text-background transition-colors bb-shadow-sm disabled:opacity-50"
            >
              บันทึกข้อมูล
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
