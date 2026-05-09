'use client';

import { useState, useEffect, useTransition, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { InventoryItem } from '@/types';
import {
  Archive,
  Plus,
  Minus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  Loader2,
  ChevronRight,
  RotateCcw,
  Settings2,
  CheckCircle2,
  RefreshCw,
  GripVertical
} from 'lucide-react';
import React from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  TouchSensor,
  DragOverlay,
  defaultDropAnimationSideEffects,
  rectIntersection
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// SPEC 2.1 Colors
const TEXT_PRIMARY = '#000000';
const TEXT_SECONDARY = '#555555';
const BG_SOFT = '#EDEDF0';

// Auto-Retry Helper (Silent)
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 500): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 1.5);
  }
}

// Sortable Card Component - Enhanced Font Size & Absolute Stability
const SortableCard = React.memo(({
  item,
  isPending,
  editingStockId,
  tempStockValue,
  setEditingStockId,
  setTempStockValue,
  handleInlineStockCheck,
  handleQuickAdjust,
  openEditModal,
  handleDelete,
  isOverlay = false
}: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const content = (
    <div className={`bg-white rounded-[24px] p-5 pt-1 border border-gray-100 shadow-sm relative group flex flex-col justify-between ${isDragging ? 'opacity-30' : ''} !overflow-visible h-full`} style={{ lineHeight: '1.6' }}>
      <div className="!overflow-visible">
        {/* Header - Optimized Space & Thai Glyph Safe */}
        <div className="flex items-start justify-between pt-4 !overflow-visible">
          <div className="flex flex-col flex-1 pr-2 !overflow-visible">
            <span className="text-[16px] text-[#000000] font-normal leading-relaxed line-clamp-1 !overflow-visible py-1" style={{ paddingTop: '8px' }}>{item.name}</span>
            <span className="text-[12px] text-[#555555] uppercase tracking-wide font-normal">1 {item.unit}</span>
          </div>
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1.5 text-gray-200 hover:text-[#000000] !transition-none focus:outline-none mt-2"
            style={{ touchAction: 'none' }}
          >
            <GripVertical className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Info Grid - Font Size +12% */}
        <div className="grid grid-cols-2 gap-4 py-1 mt-1">
          <div className="flex flex-col">
            <span className="text-[12px] text-[#555555] uppercase tracking-[0.05em] font-normal">ช่องทาง</span>
            <span className="text-[14px] text-[#000000] font-normal truncate">{item.order_channel}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[12px] text-[#555555] uppercase tracking-[0.05em] font-normal">จุดสั่งซื้อ</span>
            <span className="text-[14px] text-[#000000] font-normal">{item.order_point} {item.unit}</span>
          </div>
        </div>

        {/* Live Stock Display (Absolute Stability & Left Aligned) */}
        <div className="pt-1 flex flex-col items-start !overflow-visible">
          <span className="text-[12px] text-[#555555] uppercase tracking-[0.05em] block mb-1 font-normal">ยอดคงเหลือ</span>
          <div className="w-full flex justify-start !overflow-visible">
            {editingStockId === item.id ? (
              <input
                autoFocus
                type="number"
                value={tempStockValue}
                onChange={e => setTempStockValue(e.target.value)}
                onBlur={() => handleInlineStockCheck(item.id, tempStockValue)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleInlineStockCheck(item.id, tempStockValue);
                  if (e.key === 'Escape') setEditingStockId(null);
                }}
                className="!w-[100px] text-left px-3 text-4xl font-normal py-2 bg-[#EDEDF0] rounded-xl !outline-none text-[#000000] shadow-none border border-gray-100 !transition-none !scale-100 !transform-none focus:!scale-100 focus:!transform-none focus:ring-0"
              />
            ) : (
              <div
                onClick={() => {
                  setEditingStockId(item.id);
                  setTempStockValue((item.current_stock ?? 0).toString());
                }}
                className={`!w-[100px] py-2 px-3 rounded-xl border cursor-pointer !transition-none !scale-100 !transform-none flex items-center justify-start ${item.current_stock <= item.order_point ? 'bg-red-50 border-red-100 text-red-600' : 'bg-[#EDEDF0] border-gray-100 text-[#000000]'}`}
              >
                <span className="text-4xl font-normal !scale-100">{item.current_stock}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between pt-4 border-t border-gray-50">
        <div className="flex items-center gap-2">
          <button
            disabled={isPending}
            onClick={() => handleQuickAdjust(item.id, -1)}
            className="w-10 h-10 rounded-xl bg-gray-50 text-[#555555] flex items-center justify-center hover:bg-black hover:text-white !transition-none active:scale-95 disabled:opacity-50"
          >
            <Minus className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <button
            disabled={isPending}
            onClick={() => handleQuickAdjust(item.id, 1)}
            className="w-10 h-10 rounded-xl bg-gray-50 text-[#555555] flex items-center justify-center hover:bg-black hover:text-white !transition-none active:scale-95 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEditModal(item)}
            className="p-2.5 text-[#555555] hover:text-[#000000] hover:bg-gray-100 rounded-xl !transition-none"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleDelete(item.id)}
            className="p-2.5 text-[#555555] hover:text-red-500 hover:bg-red-50 rounded-xl !transition-none"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  if (isOverlay) {
    return (
      <div className="w-[300px] z-[1000] shadow-2xl !scale-100 !rotate-0 !transition-none">
        {content}
      </div>
    );
  }

  return (
    <motion.div
      layout
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      ref={setNodeRef}
      style={style}
      className={`h-full relative ${isDragging ? 'z-10' : 'z-0'}`}
    >
      {content}
    </motion.div>
  );
});

SortableCard.displayName = 'SortableCard';

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [lastAction, setLastAction] = useState<any>(null);
  const [showUndo, setShowUndo] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [tempStockValue, setTempStockValue] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeItem, setActiveItem] = useState<InventoryItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'วัตถุดิบ',
    unit: 'ชิ้น',
    order_channel: 'Makro',
    order_point: 5,
    target_stock: 20,
    holiday_sensitivity: false,
    current_stock: 0,
    cost_per_unit: 0
  });

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    setLoading(true);
    try {
      const data = await withRetry(async () => {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('*')
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true });
        if (error) throw error;
        return data;
      });
      setItems(data || []);
    } catch {
      // Silently handle fetch error
    } finally {
      setLoading(false);
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const item = items.find(i => i.id === event.active.id);
    if (item) setActiveItem(item);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveItem(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex(item => item.id === active.id);
    const newIndex = items.findIndex(item => item.id === over.id);
    const prevItems = [...items];
    const newItems = arrayMove(items, oldIndex, newIndex);

    setItems(newItems);
    setLastAction({ type: 'reorder', prevItems });
    setShowUndo(true);
    setIsSyncing(true);

    startTransition(async () => {
      try {
        const updates = newItems.map((item, index) => ({ id: item.id, sort_order: index }));
        await withRetry(async () => {
          const { error } = await supabase.from('inventory_items').upsert(updates);
          if (error) throw error;
        });
        setSuccessMessage('บันทึกเรียบร้อย');
        setTimeout(() => setSuccessMessage(null), 2000);
      } catch {
        setItems(prevItems);
      } finally {
        setIsSyncing(false);
      }
    });
  };

  const handleQuickAdjust = useCallback((itemId: string, amount: number) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, current_stock: Number(item.current_stock) + amount } : item
    ));
    setIsSyncing(true);

    startTransition(async () => {
      try {
        const type = amount > 0 ? 'in' : 'out';
        const { data, error } = await supabase
          .from('inventory_transactions')
          .insert([{ item_id: itemId, change_amount: amount, transaction_type: type, source: 'manual' }])
          .select().single();
        if (error) throw error;
        setLastAction({ type: 'transaction', data, prevItems: items });
        setShowUndo(true);
      } catch {
        // Silently handle adjust error
      } finally {
        setIsSyncing(false);
      }
    });
  }, [items]);

  const handleInlineStockCheck = useCallback((itemId: string, value: string) => {
    const newValue = parseFloat(value);
    if (isNaN(newValue)) {
      setEditingStockId(null);
      return;
    }

    setItems(prev => prev.map(item => item.id === itemId ? { ...item, current_stock: newValue } : item));
    setEditingStockId(null);
    setIsSyncing(true);

    startTransition(async () => {
      try {
        const { data, error } = await supabase
          .from('inventory_checks')
          .insert([{ item_id: itemId, counted_stock: newValue }])
          .select().single();
        if (error) throw error;
        setLastAction({ type: 'check', data, prevItems: items });
        setShowUndo(true);
      } catch {
        // Silently handle check error
      } finally {
        setIsSyncing(false);
      }
    });
  }, [items]);

  const handleUndo = async () => {
    if (!lastAction) return;
    setIsSyncing(true);

    const prevItems = lastAction.prevItems;
    if (prevItems) {
      setItems(prevItems);
    }

    startTransition(async () => {
      try {
        if (lastAction.type === 'reorder') {
          const updates = prevItems.map((item: any, index: number) => ({ id: item.id, sort_order: index }));
          await supabase.from('inventory_items').upsert(updates);
        } else {
          const table = lastAction.type === 'transaction' ? 'inventory_transactions' : 'inventory_checks';
          await supabase.from(table).delete().eq('id', lastAction.data.id);
        }
        setShowUndo(false);
        setLastAction(null);
        setSuccessMessage('กู้คืนแล้ว');
        setTimeout(() => setSuccessMessage(null), 2000);
      } catch {
        // Silently handle undo error
      } finally {
        setIsSyncing(false);
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setIsSyncing(true);
    try {
      const payload = { ...formData, order_point: Number(formData.order_point), target_stock: Number(formData.target_stock), current_stock: Number(formData.current_stock), cost_per_unit: Number(formData.cost_per_unit) };
      if (editingItem) {
        const { error } = await supabase.from('inventory_items').update(payload).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('inventory_items').insert([payload]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      resetForm();
      fetchItems();
      setSuccessMessage('บันทึกแล้ว');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch {
      // Silently handle submit error
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ยืนยัน?')) return;
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('inventory_items').delete().eq('id', id);
      if (error) throw error;
      fetchItems();
    } catch {
      // Silently handle delete error
    } finally {
      setIsSyncing(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', category: 'วัตถุดิบ', unit: 'ชิ้น', order_channel: 'Makro', order_point: 5, target_stock: 20, holiday_sensitivity: false, current_stock: 0, cost_per_unit: 0 });
    setEditingItem(null);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({ name: item.name, category: item.category, unit: item.unit, order_channel: item.order_channel, order_point: item.order_point, target_stock: item.target_stock, holiday_sensitivity: item.holiday_sensitivity, current_stock: item.current_stock, cost_per_unit: item.cost_per_unit });
    setIsModalOpen(true);
  };

  const filteredItems = items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.category.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#EDEDF0] p-4 md:p-6 text-[#000000] font-normal relative overflow-hidden">
      {/* Syncing Indicator Dot */}
      <AnimatePresence>
        {isSyncing && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="fixed top-8 right-8 w-2 h-2 bg-[#555555] rounded-full z-[300] shadow-[0_0_8px_rgba(85,85,85,0.3)]"
          />
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-normal tracking-tighter text-[#000000] uppercase flex items-center gap-3">
              <Archive className="w-8 h-8 text-orange-500" strokeWidth={1} />
              คลังสินค้า
            </h1>
            <p className="text-[#555555] text-xs font-normal uppercase tracking-[0.2em] px-1 font-normal opacity-60">ระบบจัดการสินค้าประสิทธิภาพสูง</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555555] opacity-40" />
              <input
                type="text"
                placeholder="ค้นหา..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-2xl text-sm focus:outline-none w-[200px] md:w-[300px] font-normal shadow-sm"
              />
            </div>
            <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex items-center gap-2 bg-[#000000] text-white px-6 py-2.5 rounded-2xl hover:bg-orange-600 !transition-none active:scale-95 font-normal uppercase text-xs tracking-widest shadow-xl">
              <Plus className="w-4 h-4" />
              เพิ่มสินค้า
            </button>
          </div>
        </header>

        {/* Grid Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 text-[#555555] gap-4">
            <Loader2 className="w-10 h-10 animate-spin opacity-20" />
            <span className="text-xs uppercase tracking-[0.3em] font-normal">Loading...</span>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredItems.map(i => i.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredItems.map(item => (
                  <SortableCard key={item.id} item={item} isPending={isPending} editingStockId={editingStockId} tempStockValue={tempStockValue} setEditingStockId={setEditingStockId} setTempStockValue={setTempStockValue} handleInlineStockCheck={handleInlineStockCheck} handleQuickAdjust={handleQuickAdjust} openEditModal={openEditModal} handleDelete={handleDelete} />
                ))}
              </div>
            </SortableContext>

            <DragOverlay dropAnimation={null}>
              {activeItem ? (
                <SortableCard item={activeItem} isOverlay />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Success Toast */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#555555] text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-2 z-[200]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-normal">{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Undo Toast */}
      {showUndo && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#000000] text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-full duration-500 z-[200] border border-white/5">
          <div className="flex items-center gap-3">
            <RotateCcw className="w-4 h-4 text-orange-500" />
            <span className="text-xs uppercase tracking-[0.2em] font-normal">สำเร็จ</span>
          </div>
          <button onClick={handleUndo} className="text-orange-500 text-xs uppercase tracking-[0.2em] font-normal hover:underline">ย้อนกลับ</button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#000000]/10 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
              <div><h2 className="text-2xl font-normal text-[#000000] uppercase tracking-tight">{editingItem ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่'}</h2><p className="text-[11px] text-[#555555] uppercase tracking-[0.2em] mt-1 font-normal">ระบบจัดการคลังสินค้า</p></div>
              <Settings2 className="w-6 h-6 text-orange-500" strokeWidth={1} />
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[11px] uppercase tracking-[0.2em] text-[#555555] ml-1 font-normal">ชื่อสินค้า</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm text-[#000000] focus:outline-none !transition-none font-normal" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-[0.2em] text-[#555555] ml-1 font-normal">ช่องทางสั่งซื้อ</label>
                  <input list="channels" value={formData.order_channel} onChange={e => setFormData({ ...formData, order_channel: e.target.value })} placeholder="เลือก..." className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm text-[#000000] focus:outline-none !transition-none font-normal" /><datalist id="channels"><option value="Makro" /><option value="สั่งพี่ต้า" /><option value="สาขา 2" /></datalist>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-[0.2em] text-[#555555] ml-1 font-normal">หน่วยนับ</label>
                  <input type="text" required value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm text-[#000000] focus:outline-none !transition-none font-normal" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-[0.2em] text-[#555555] ml-1 font-normal">จุดสั่งซื้อ</label>
                  <input type="number" required value={formData.order_point} onChange={e => setFormData({ ...formData, order_point: Number(e.target.value) })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm text-[#000000] font-normal" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-[0.2em] text-[#555555] ml-1 font-normal">เป้าหมาย</label>
                  <input type="number" required value={formData.target_stock} onChange={e => setFormData({ ...formData, target_stock: Number(e.target.value) })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm text-[#000000] font-normal" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-[0.2em] text-[#555555] ml-1 font-normal">คงเหลือ</label>
                  <input type="number" required value={formData.current_stock} onChange={e => setFormData({ ...formData, current_stock: Number(e.target.value) })} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm text-[#000000] font-normal" />
                </div>
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-[#555555] uppercase tracking-[0.2em] text-[11px] hover:bg-gray-50 rounded-2xl !transition-none font-normal">ยกเลิก</button>
                <button type="submit" disabled={loading} className="flex-[2] py-4 bg-[#000000] text-white uppercase tracking-[0.2em] text-[11px] rounded-2xl hover:bg-orange-600 !transition-none shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 font-normal">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                  ยืนยันการบันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
