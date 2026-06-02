'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Loader2, GripVertical, Undo2, Redo2, Trash2, X, History, Search, ArrowDownToLine, ArrowUpFromLine, ShoppingCart, PlusCircle, PackagePlus, PackageMinus, CloudUpload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toPng } from 'html-to-image';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { recordTransaction, fetchTransactionHistory, fetchFrequentItems, deleteInventoryItem } from '@/app/actions/inventory-actions';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  restrictToWindowEdges,
  snapCenterToCursor,
} from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  order_qty: number;
  order_point: number;
  target_stock: number;
  unit: string;
  source: string;
  sort_order: number;
  updated_at?: string;
  [key: string]: any;
}

interface ColumnDef {
  id: string;
  label: string;
  width: string;
  type: 'text' | 'number';
}

const defaultColumns: ColumnDef[] = [
  { id: 'name', label: 'ชื่อรายการ', width: '220px', type: 'text' },
  { id: 'stock', label: 'คงเหลือ', width: '80px', type: 'number' },
  { id: 'order_qty', label: 'จำนวนสั่งซื้อ', width: '100px', type: 'number' },
  { id: 'order_point', label: 'จุดสั่งซื้อ', width: '100px', type: 'number' },
  { id: 'target_stock', label: 'จำนวนที่ต้องมี', width: '120px', type: 'number' },
  { id: 'unit', label: 'หน่วย', width: '80px', type: 'text' },
  { id: 'source', label: 'ช่องทางสั่งซื้อ', width: '160px', type: 'text' },
];

function ColumnHeader({ col, updateColumnLabel, saveColumnsConfig, onResize, onResizeEnd }: {
  col: ColumnDef;
  updateColumnLabel: (id: string, label: string) => void;
  saveColumnsConfig: () => void;
  onResize: (id: string, width: number) => void;
  onResizeEnd: (id: string, width: number) => void;
}) {
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    isResizing.current = true;
    startX.current = e.pageX;
    startWidth.current = parseInt(col.width) || 150;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = moveEvent.pageX - startX.current;
      const newWidth = Math.max(80, startWidth.current + delta);
      onResize(col.id, newWidth);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      isResizing.current = false;
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;

      const delta = upEvent.pageX - startX.current;
      const finalWidth = Math.max(80, startWidth.current + delta);
      onResizeEnd(col.id, finalWidth);
    };

    document.addEventListener('mousemove', handleMouseMove, { signal });
    document.addEventListener('mouseup', handleMouseUp, { signal });
    e.preventDefault();
  };

  const style = {
    width: col.width,
    minWidth: col.width === 'auto' ? '80px' : col.width,
  };

  return (
    <th
      style={style}
      className={`p-0 font-normal ${col.id === 'source' ? '' : 'border-r border-[#000000]/5'} group relative select-none bg-transparent`}
    >
      <div className="p-4 flex items-center justify-center">
        <input
          type="text"
          value={col.label}
          onChange={(e) => updateColumnLabel(col.id, e.target.value)}
          onBlur={saveColumnsConfig}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          onPointerDown={(e) => e.stopPropagation()}
          className="bg-transparent border-none focus:outline-none focus:bg-white/50 text-[13px] font-normal text-[#000000]/60 uppercase tracking-wider cursor-text px-2 py-1 rounded-xl text-center w-full"
        />
      </div>
      {/* Resizer Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute right-0 top-0 bottom-0 w-1 px-0.5 cursor-col-resize hover:bg-black/10 transition-all z-20 group/resizer`}
      >
        <div className="w-[1px] h-full bg-[#000000]/5 group-hover/resizer:bg-black/20 mx-auto" />
      </div>
    </th>
  );
}

const SortableRow = React.memo(({ item, index: rowIndex, columns, handleUpdateField, handleSaveField, requestDelete, handleFocus }: {
  item: InventoryItem;
  index: number;
  columns: ColumnDef[];
  handleUpdateField: (id: string, field: string, value: any) => void;
  handleSaveField: (id: string, field: string, value: any) => void;
  requestDelete: (id: string) => void;
  handleFocus: () => void;
  totalItems: number;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition: dndTransition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: dndTransition || 'transform 150ms cubic-bezier(0.2, 0, 0, 1)',
    zIndex: isDragging ? 100 : 1,
    willChange: 'transform',
  };

  return (
    <tr
      ref={setNodeRef}
      className={cn(
        "border-b border-[#000000]/5 hover:bg-[#000000]/5 transition-all duration-300 group",
        isDragging && "opacity-70 scale-[1.02] shadow-xl z-[100] bg-white ring-1 ring-black/5 rounded-3xl cursor-grabbing"
      )}
      style={isDragging ? style : undefined}
    >
      {/* 0. Static Row Index (Fixed) */}
      <td className="w-10 min-w-[40px] border-r border-[#000000]/5 p-0 text-center align-middle bg-black/[0.01]">
        <div className="flex items-center justify-center h-full">
          <span className="text-[10px] font-normal text-black/20 tabular-nums tracking-tighter">
            {(rowIndex + 1).toString().padStart(2, '0')}
          </span>
        </div>
      </td>

      <td
        style={!isDragging ? style : undefined}
        className="w-10 min-w-[40px] border-r border-[#000000]/5 p-0 text-center align-middle"
      >
        <div
          className="flex items-center justify-center h-full min-h-[64px] w-full cursor-grab active:cursor-grabbing text-[#000000]/20 hover:text-[#000000] transition-all duration-300 p-3 touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-5 h-5" />
        </div>
      </td>

      {columns.map((col, index) => (
        <td
          key={col.id}
          style={{
            width: col.width,
            minWidth: col.id === 'name' ? '240px' : col.width,
            ...(!isDragging ? style : {})
          }}
          className={`p-0 border-r border-[#000000]/5 relative group/cell ${index === columns.length - 1 ? 'border-r-0' : ''}`}
        >
          <EditableCell
            item={item}
            col={col}
            rowIndex={rowIndex}
            handleUpdateField={handleUpdateField}
            handleSaveField={handleSaveField}
            requestDelete={requestDelete}
            handleFocus={handleFocus}
          />
        </td>
      ))}
    </tr>
  );
});

SortableRow.displayName = 'SortableRow';

// 1. ฟังก์ชันคำนวณสีสำหรับแสดงผลยอดคงเหลือ
function getStockColorClass(stock: number, targetStock: number): string {
  if (stock <= targetStock) return 'text-red-600';
  if (stock <= targetStock + 1) return 'text-orange-500';
  return 'text-green-600';
}

const PurchaseOrdersModal = dynamic(() => import('./PurchaseOrdersModal'), { ssr: false });

function EditableCell({ item, col, rowIndex, handleUpdateField, handleSaveField, requestDelete, handleFocus }: any) {
  const [localValue, setLocalValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with global state when not focused
  useEffect(() => {
    if (!isFocused) {
      let val = item[col.id];

      // Phase 1: COMPUTED LOGIC INTEGRATION
      if (col.id === 'order_qty') {
        const stock = Number(item.stock) || 0;
        const orderPoint = Number(item.order_point) || 0;
        const targetStock = Number(item.target_stock) || 0;
        const computedOrderQty = stock <= orderPoint ? Math.max(0, targetStock - stock) : 0;
        val = computedOrderQty === 0 ? '' : computedOrderQty;
      }

      const displayVal = val === null || val === undefined ? '' : String(val);
      setLocalValue(displayVal);
      if (inputRef.current) {
        inputRef.current.value = displayVal;
      }
    }
  }, [item[col.id], item.stock, item.order_point, item.target_stock, isFocused, col.id]);

  const handleBlur = () => {
    const val = inputRef.current?.value || '';
    let finalVal: string | number = val;

    if (col.type === 'number') {
      const numericValue = val === "" ? 0 : Number(val);
      finalVal = isNaN(numericValue) ? 0 : numericValue;
    }

    setLocalValue(String(finalVal));
    setIsFocused(false);

    // PERSISTENCE ARMOR: Push updates to Supabase via parent handlers
    handleUpdateField(item.id, col.id, finalVal);
    handleSaveField(item.id, col.id, finalVal);
  };

  // ควบคุมการจัดเรียงข้อความและสีเฉพาะคอลัมน์คงเหลือ
  const getAlignmentAndColor = () => {
    if (col.id === 'name') return 'text-left pr-10 text-[#000000]';
    if (col.id === 'stock') return `text-center ${getStockColorClass(Number(item.stock) || 0, Number(item.target_stock) || 0)}`;
    if (col.id === 'order_qty') return 'text-center text-[#000000]';
    return 'text-center text-[#000000]/60';
  };

  return (
    <div className="flex items-center relative h-full">
      <input
        ref={inputRef}
        type="text"
        inputMode={col.type === 'number' ? 'decimal' : 'text'}
        defaultValue={localValue}
        onFocus={() => {
          setIsFocused(true);
          handleFocus();
        }}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
            const nextRowInput = document.querySelector(`input[data-col-id="${col.id}"][data-row-index="${rowIndex + 1}"]`) as HTMLInputElement;
            if (nextRowInput) {
              setTimeout(() => {
                nextRowInput.focus();
                nextRowInput.select();
              }, 10);
            }
          }
        }}
        data-col-id={col.id}
        data-row-index={rowIndex}
        readOnly={col.id === 'order_qty'}
        className={`w-full px-4 py-4 pt-5 pb-3 min-h-[56px] bg-transparent border-none focus:outline-none focus:bg-[#fdfcf0]/80 text-base md:text-sm font-normal leading-[1.6] transition-all ${getAlignmentAndColor()} ${col.type === 'number' ? 'font-mono' : ''} ${col.id === 'order_qty' ? 'bg-[#000000]/5 cursor-not-allowed select-none' : ''}`}
      />
      {col.id === 'name' && (
        <button
          onClick={() => requestDelete(item.id)}
          aria-label="Delete inventory item"
          className="absolute right-3 p-1.5 text-[#000000]/20 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover/cell:opacity-100"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function DynamicInventoryManager() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [columns, setColumns] = useState<ColumnDef[]>(defaultColumns);
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'synced'>('idle');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPurchaseOrderModal, setShowPurchaseOrderModal] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['all']);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  // Add Form State
  const [newItemData, setNewItemData] = useState<Partial<InventoryItem>>({});

  // History State
  const [undoStack, setUndoStack] = useState<{ items: InventoryItem[], cols: ColumnDef[] }[]>([]);
  const [redoStack, setRedoStack] = useState<{ items: InventoryItem[], cols: ColumnDef[] }[]>([]);
  const previousStateRef = useRef<{ items: InventoryItem[], cols: ColumnDef[] }>({ items: [], cols: defaultColumns });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Quick Entry State
  const [quickSearch, setQuickSearch] = useState('');
  const [quickQty, setQuickQty] = useState('');
  const [quickType, setQuickType] = useState<'IN' | 'OUT'>('IN');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [frequentItems, setFrequentItems] = useState<{ id: string, name: string }[]>([]);
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);

  // Phase 1 & 2: COMPUTED ORDER LOGIC
  const itemsToOrder = useMemo(() => {
    return items.filter(item => {
      const stock = Number(item.stock) || 0;
      const orderPoint = Number(item.order_point) || 0;
      const targetStock = Number(item.target_stock) || 0;
      return stock <= orderPoint && targetStock > stock;
    }).map(item => {
      const stock = Number(item.stock) || 0;
      const targetStock = Number(item.target_stock) || 0;
      return {
        ...item,
        computedOrderQty: targetStock - stock
      };
    });
  }, [items]);

  const poSources = useMemo(() => {
    const sources = new Set<string>();
    itemsToOrder.forEach(item => {
      sources.add(item.source || 'ไม่ได้ระบุแหล่งที่มา');
    });
    return Array.from(sources);
  }, [itemsToOrder]);

  const displayedPoItems = useMemo(() => {
    if (selectedChannels.includes('all')) return itemsToOrder;
    return itemsToOrder.filter(i => selectedChannels.includes(i.source || 'ไม่ได้ระบุแหล่งที่มา'));
  }, [itemsToOrder, selectedChannels]);

  const exportPOImage = async () => {
    const element = document.getElementById('blackandbrew-po-table');
    if (!element) return;
    try {
      // 1. ดึงความสูงและความกว้างที่แท้จริงของตารางทั้งหมด
      const fullHeight = element.scrollHeight;
      const fullWidth = element.scrollWidth;

      const dataUrl = await toPng(element, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#fff3dd',
        width: fullWidth,
        height: fullHeight,
        style: {
          margin: '0',
          padding: '0',
          border: 'none',
          boxShadow: 'none',
          maxHeight: 'none', // ปลดล็อกข้อจำกัดความสูง
          overflow: 'hidden' // ป้องกันไม่ให้มี Scrollbar โผล่ในรูปภาพ
        },
        filter: (node) => {
          // 2. กรองเอาปุ่มกดออกไปจากรูปภาพ (อ้างอิงผ่าน ID)
          // @ts-ignore
          if (node?.id === 'po-action-buttons') {
            return false;
          }
          return true;
        }
      });
      const link = document.createElement('a');
      link.download = `PurchaseOrders-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export PO image:', err);
    }
  };

  const filteredItems = useMemo(() => {
    if (!quickSearch) return [];
    return items.filter(item =>
      item.name.toLowerCase().includes(quickSearch.toLowerCase())
    ).slice(0, 10);
  }, [items, quickSearch]);

  useEffect(() => {
    loadFrequentItems();
    fetchConfigAndInventory();

    const channel = supabase
      .channel('inventory_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setItems(prev => {
            if (prev.find(i => i.id === payload.new.id)) return prev;
            return [...prev, payload.new as InventoryItem];
          });
        } else if (payload.eventType === 'UPDATE') {
          setItems(prev => prev.map(item => item.id === payload.new.id ? payload.new as InventoryItem : item));
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(item => item.id !== payload.old.id));
        }
      })
      .subscribe();

    // Fast Initial Column Load from LocalStorage
    const savedWidths = localStorage.getItem('inventory-column-widths');
    if (savedWidths) {
      try {
        const widths = JSON.parse(savedWidths);
        // MODULE 3: SYSTEM_SECURITY_HARDENING (Type Validation Engine)
        if (widths && typeof widths === 'object' && !Array.isArray(widths)) {
          const safeWidths: Record<string, string> = {};
          Object.entries(widths).forEach(([key, val]) => {
            const numVal = Number(val);
            if (typeof key === 'string' && !isNaN(numVal) && numVal > 0 && numVal < 2000) {
              safeWidths[key] = String(numVal); // ColumnDef.width is string
            }
          });
          setColumns(prev => prev.map(col => ({
            ...col,
            width: safeWidths[col.id] || col.width
          })));
        }
      } catch (e) {
        console.error('Failed to parse saved widths:', e);
        localStorage.removeItem('inventory-column-widths'); // ล้างข้อมูลเสียหายออก
      }
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    previousStateRef.current = { items, cols: columns };
  }, [items, columns]);

  async function fetchConfigAndInventory() {
    try {
      const [configRes, inventoryRes] = await Promise.all([
        supabase.from('inventory_config').select('settings').eq('id', 'column_labels').single(),
        supabase.from('inventory_items').select('id, name, stock, order_qty, order_point, target_stock, unit, source, sort_order, updated_at').order('sort_order', { ascending: true })
      ]);

      if (inventoryRes.error) {
        console.error('Supabase Error (Fetch):', inventoryRes.error.message, inventoryRes.error.details);
        throw inventoryRes.error;
      }

      const loadedItems = inventoryRes.data || [];
      setItems(loadedItems);

      let loadedCols = defaultColumns;
      if (configRes.data && configRes.data.settings) {
        const settings = configRes.data.settings;
        if (settings.order && settings.labels) {
          // Overwrite Protection: Check localStorage first for widths
          const localWidths = JSON.parse(localStorage.getItem('inventory-column-widths') || '{}');

          const newCols = settings.order.map((id: string) => {
            const def = defaultColumns.find(c => c.id === id);
            return def ? {
              ...def,
              label: settings.labels[id] || def.label,
              width: localWidths[id] || settings.widths?.[id] || def.width
            } : null;
          }).filter(Boolean) as ColumnDef[];

          if (newCols.length > 0) {
            loadedCols = newCols;
            setColumns(newCols);
          }
        }
      }

      previousStateRef.current = { items: loadedItems, cols: loadedCols };
    } catch (err: any) {
      console.error('Failed to fetch inventory:', err.message || err);
    } finally {
      setLoading(false);
    }
  }

  function sanitizeInventoryItem(item: InventoryItem) {
    const sanitized = { ...item };
    const numericFields = ['stock', 'order_qty', 'order_point', 'target_stock'];

    numericFields.forEach(field => {
      if (sanitized[field] === '' || sanitized[field] === null || sanitized[field] === undefined || isNaN(Number(sanitized[field]))) {
        sanitized[field] = 0;
      } else {
        sanitized[field] = Number(sanitized[field]);
      }
    });

    delete sanitized.updated_at;
    return sanitized;
  }

  function pushHistory() {
    setUndoStack(prev => [...prev, previousStateRef.current]);
    setRedoStack([]);
  }

  async function handleAddItemSubmit(e: React.FormEvent) {
    e.preventDefault();
    pushHistory();

    const initialSortOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order || 0)) + 1 : 1;

    const newItem = {
      name: newItemData.name || '',
      stock: (newItemData.stock as unknown as string === "" || newItemData.stock === undefined || newItemData.stock === null) ? 0 : Number(newItemData.stock),
      order_qty: (newItemData.order_qty as unknown as string === "" || newItemData.order_qty === undefined || newItemData.order_qty === null) ? 0 : Number(newItemData.order_qty),
      order_point: (newItemData.order_point as unknown as string === "" || newItemData.order_point === undefined || newItemData.order_point === null) ? 0 : Number(newItemData.order_point),
      target_stock: (newItemData.target_stock as unknown as string === "" || newItemData.target_stock === undefined || newItemData.target_stock === null) ? 0 : Number(newItemData.target_stock),
      unit: newItemData.unit || '',
      source: newItemData.source || '',
      sort_order: initialSortOrder
    };

    const tempId = crypto.randomUUID();
    setItems(prev => [...prev, { ...newItem, id: tempId }]);
    setShowAddModal(false);
    setNewItemData({});

    try {
      setSavingState('saving');

      // Query maximum sort_order from Supabase to assign max + 1
      const { data: maxOrderData, error: maxOrderErr } = await supabase
        .from('inventory_items')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextSortOrder = (maxOrderErr || !maxOrderData) ? initialSortOrder : (maxOrderData.sort_order || 0) + 1;

      const dbNewItem = {
        ...newItem,
        sort_order: nextSortOrder
      };

      const { data, error } = await supabase
        .from('inventory_items')
        .insert([dbNewItem])
        .select()
        .single();

      if (error) throw error;
      setItems(prev => prev.map(item => item.id === tempId ? data : item));
      setSavingState('synced');
      setTimeout(() => setSavingState('idle'), 2000);
    } catch (err: any) {
      console.error('Failed to add item:', err.message || err);
      setItems(prev => prev.filter(item => item.id !== tempId));
      setSavingState('idle');
    }
  }

  async function executeDelete() {
    if (!deleteId) return;
    pushHistory();
    setItems(prev => prev.filter(item => item.id !== deleteId));
    setDeleteId(null);

    try {
      setSavingState('saving');
      /**
       * PPR-Friendly Update: 
       * Revalidate path to sync server state while keeping local filtering for Zero CLS.
       */
      const res = await deleteInventoryItem(deleteId);
      if (!res.success) throw new Error(res.error);

      setSavingState('synced');
      setTimeout(() => setSavingState('idle'), 2000);
    } catch (err: any) {
      console.error('Supabase Error (Delete):', err.message || err);
      fetchConfigAndInventory();
    }
  }

  function handleFocus() {
    if (!isEditing) {
      setIsEditing(true);
    }
  }

  function handleUpdateField(id: string, field: string, value: any) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  }

  async function handleSaveField(id: string, field: string, value: any) {
    setIsEditing(false);
    const original = previousStateRef.current.items.find(i => i.id === id);

    let sanitizedValue = value;
    const numericFields = ['stock', 'order_qty', 'order_point', 'target_stock'];
    if (numericFields.includes(field)) {
      sanitizedValue = value === '' || value === null || value === undefined ? 0 : Number(value);
      if (isNaN(sanitizedValue as number)) sanitizedValue = 0;
    }

    // Phase 2: Persistence Armor - Compare sanitized values to prevent redundant saves and keep 0
    if (original && Number(original[field]) === Number(sanitizedValue)) return;

    pushHistory();
    setSavingState('saving');

    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ [field]: sanitizedValue })
        .eq('id', id);

      if (error) throw error;
      setSavingState('synced');
      setTimeout(() => setSavingState('idle'), 2000);
    } catch (err: any) {
      console.error(`Failed to update ${field}:`, err.message || err);
      setSavingState('idle');
      fetchConfigAndInventory();
    }
  }

  function updateColumnLabel(id: string, label: string) {
    setColumns(prev => prev.map(col => col.id === id ? { ...col, label } : col));
  }

  async function saveColumnsConfig(currentCols: ColumnDef[] = columns) {
    setSavingState('saving');

    // Local Persistence
    const widths = currentCols.reduce((acc, c) => ({ ...acc, [c.id]: c.width }), {});
    localStorage.setItem('inventory-column-widths', JSON.stringify(widths));

    const settings = {
      order: currentCols.map(c => c.id),
      labels: currentCols.reduce((acc, c) => ({ ...acc, [c.id]: c.label }), {}),
      widths
    };
    try {
      const { error } = await supabase.from('inventory_config').upsert({ id: 'column_labels', settings });
      if (error) throw error;
      setSavingState('synced');
      setTimeout(() => setSavingState('idle'), 2000);
    } catch (err: any) {
      console.error('Failed to save columns config:', err.message || err);
      setSavingState('idle');
    }
  }

  function handleColumnResize(id: string, width: number) {
    setColumns(prev => prev.map(col => col.id === id ? { ...col, width: `${width}px` } : col));
  }

  function handleColumnResizeEnd(id: string, width: number) {
    setColumns(prev => {
      const nextCols = prev.map(col => col.id === id ? { ...col, width: `${width}px` } : col);
      saveColumnsConfig(nextCols);
      return nextCols;
    });
  }

  async function handleDragStartRows(event: any) {
    setActiveRowId(event.active.id);
  }

  async function handleDragEndRows(event: DragEndEvent) {
    setActiveRowId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const rollbackItems = [...items];
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const overIndex = over ? items.findIndex((i) => i.id === over.id) : -1;

    // Zero Latency Local Update
    const newItems = arrayMove(items, oldIndex, overIndex);
    const updatedItems = newItems.map((item, index) => ({ ...item, sort_order: index + 1 }));
    setItems(updatedItems);
    setSavingState('saving');

    // Background Sync
    try {
      const { error } = await supabase.from('inventory_items').upsert(
        updatedItems.map(item => ({ id: item.id, sort_order: item.sort_order }))
      );
      if (error) throw error;
      setSavingState('synced');
      setTimeout(() => setSavingState('idle'), 2000);
    } catch (err) {
      console.error('World-Class DND Rollback (Inventory):', err);
      setItems(rollbackItems);
      setSavingState('idle');
      alert('ไม่สามารถจัดลำดับได้ เนื่องจากปัญหาการเชื่อมต่อ');
    }
  }

  async function syncFullStateToDB(currentItems: InventoryItem[], currentCols: ColumnDef[]) {
    setSavingState('saving');
    setIsSyncing(true);
    try {
      const sanitizedItems = currentItems.map((item, index) => sanitizeInventoryItem({ ...item, sort_order: index + 1 }));
      if (sanitizedItems.length > 0) {
        const { error: upsertErr } = await supabase.from('inventory_items').upsert(sanitizedItems);
        if (upsertErr) throw upsertErr;
      }

      const { data: dbItems } = await supabase.from('inventory_items').select('id');
      if (dbItems) {
        const snapshotIds = sanitizedItems.map(i => i.id);
        const toDelete = dbItems.filter(dbI => !snapshotIds.includes(dbI.id)).map(i => i.id);
        if (toDelete.length > 0) {
          await supabase.from('inventory_items').delete().in('id', toDelete);
        }
      }

      const settings = {
        order: currentCols.map(c => c.id),
        labels: currentCols.reduce((acc, c) => ({ ...acc, [c.id]: c.label }), {})
      };
      await supabase.from('inventory_config').upsert({ id: 'column_labels', settings });

      setSavingState('synced');
      setTimeout(() => setSavingState('idle'), 2000);
    } catch (err: any) {
      console.error('Error syncing undo/redo:', err.message || err);
      setSavingState('idle');
      fetchConfigAndInventory();
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleUndo() {
    if (undoStack.length === 0 || isSyncing) return;
    const lastState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, previousStateRef.current]);
    setItems(lastState.items);
    setColumns(lastState.cols);
    await syncFullStateToDB(lastState.items, lastState.cols);
  }

  async function handleRedo() {
    if (redoStack.length === 0 || isSyncing) return;
    const nextState = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, previousStateRef.current]);
    setItems(nextState.items);
    setColumns(nextState.cols);
    await syncFullStateToDB(nextState.items, nextState.cols);
  }

  async function loadFrequentItems() {
    const res = await fetchFrequentItems();
    if (res.success && res.data) {
      setFrequentItems(res.data);
    }
  }

  async function handleOpenHistory() {
    setTransactionHistory([]);
    setShowHistoryModal(true);
    const res = await fetchTransactionHistory();
    if (res.success && res.data) {
      setTransactionHistory(res.data);
    } else if (res.error) {
      console.error('[UI] History fetch failed:', res.error);
    }
  }

  async function handleCancelTransaction(txId: string, itemId: string, type: 'IN' | 'OUT', quantity: number) {
    if (!window.confirm('ยืนยันการยกเลิกรายการนี้? ยอดสต็อกจะถูกปรับคืนอัตโนมัติ')) return;

    setSavingState('saving');
    try {
      // 1. Get current stock
      const { data: itemData, error: itemError } = await supabase
        .from('inventory_items')
        .select('stock')
        .eq('id', itemId)
        .single();

      if (itemError) throw itemError;

      const currentStock = itemData.stock || 0;
      const newStock = type === 'IN' ? currentStock - quantity : currentStock + quantity;

      // 2. Update stock
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ stock: newStock })
        .eq('id', itemId);

      if (updateError) throw updateError;

      // 3. Delete transaction
      const { error: deleteError } = await supabase
        .from('inventory_transactions')
        .delete()
        .eq('id', txId);

      if (deleteError) throw deleteError;

      // Refresh history
      const res = await fetchTransactionHistory();
      if (res.success && res.data) {
        setTransactionHistory(res.data);
      }

      setSavingState('synced');
      setTimeout(() => setSavingState('idle'), 2000);
    } catch (err: any) {
      console.error('Failed to cancel transaction:', err.message || err);
      alert('ไม่สามารถยกเลิกรายการได้: ' + (err.message || 'Unknown error'));
      setSavingState('idle');
    }
  }

  async function handleQuickSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quickSearch || !quickQty) return;

    // Find item
    const item = items.find(i => i.name === quickSearch || i.id === quickSearch);
    if (!item) {
      alert('ไม่พบสินค้าที่ระบุ');
      return;
    }

    const qty = Number(quickQty);
    if (isNaN(qty) || qty <= 0) {
      alert('กรุณาระบุจำนวนที่ถูกต้อง');
      return;
    }

    setSavingState('saving');

    const res = await recordTransaction(item.id, quickType, qty, 'Quick Entry');

    if (!res.success) {
      alert(res.error);
      setSavingState('idle');
      return;
    }

    // Optimistically update local state if not picked up by realtime yet
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, stock: res.newStock } : i));
    setQuickSearch('');
    setQuickQty('');
    setSavingState('synced');
    router.refresh();
    setTimeout(() => setSavingState('idle'), 2000);
    loadFrequentItems();
    // Auto-refresh history if modal is open
    if (showHistoryModal) {
      const histRes = await fetchTransactionHistory();
      if (histRes.success && histRes.data) {
        setTransactionHistory(histRes.data);
      }
    }
  }

  const selectedQuickItem = items.find(i => i.name === quickSearch || i.id === quickSearch);

  // 2. คำนวณสีของป้ายคงเหลือเฉพาะเมื่อมีไอเท็มถูกเลือก
  let quickBadgeStyles = { bg: 'bg-emerald-50/60 border-emerald-100/70', label: 'text-emerald-600/70', val: 'text-emerald-900' };
  if (selectedQuickItem) {
    const sqStock = Number(selectedQuickItem.stock) || 0;
    const sqTarget = Number(selectedQuickItem.target_stock) || 0;

    if (sqStock <= sqTarget) {
      quickBadgeStyles = { bg: 'bg-red-50/60 border-red-100/70', label: 'text-red-600/70', val: 'text-red-900' };
    } else if (sqStock <= sqTarget + 1) {
      quickBadgeStyles = { bg: 'bg-orange-50/60 border-orange-100/70', label: 'text-orange-600/70', val: 'text-orange-900' };
    }
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-transparent text-[#000000]">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#000000]" strokeWidth={1.5} />
        <span className="font-normal text-sm uppercase tracking-widest text-[#000000]">กำลังซิงค์ข้อมูล...</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 w-full max-w-full bg-transparent text-black font-normal transition-all duration-300 flex flex-col items-start p-4 md:p-8">
        <div className="w-fit mx-auto flex flex-col items-start">
          <div className="w-full flex flex-col items-center mb-8 text-center">
            <motion.h1
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="text-3xl font-normal tracking-[0.2em] text-[#000000] uppercase"
            >
              คลังสินค้า
            </motion.h1>
          </div>

          <div className="w-full flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 px-2">
            <div className="flex items-center gap-1.5 text-sm font-normal min-w-[70px]">
              {savingState === 'saving' && (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#000000]" />
                  <span className="text-[#000000]">กำลังซิงค์ข้อมูล...</span>
                </>
              )}
              {savingState === 'synced' && (
                <span className="text-emerald-500">✓ ซิงค์ข้อมูลแล้ว</span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 border-r border-slate-200 pr-4 mr-2">
                <button
                  onClick={handleUndo}
                  disabled={undoStack.length === 0 || isSyncing}
                  className={`p-2.5 rounded-3xl transition-all ${undoStack.length === 0 || isSyncing
                    ? 'text-[#94a3b8] cursor-default'
                    : 'text-[#000000] hover:bg-purple-100'
                    }`}
                  title="ย้อนกลับ (Undo)"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={redoStack.length === 0 || isSyncing}
                  className={`p-2.5 rounded-3xl transition-all ${redoStack.length === 0 || isSyncing
                    ? 'text-[#94a3b8] cursor-default'
                    : 'text-[#000000] hover:bg-purple-100'
                    }`}
                  title="ทำซ้ำ (Redo)"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>


            </div>
          </div>

          {/* Quick Actions */}
          <div className="w-full flex flex-col md:flex-row gap-4 mb-8 bg-white p-4 rounded-3xl border-2 border-black shadow-sm sticky top-4 md:top-8 z-[50]">
            <div className="flex-1">
              <form onSubmit={handleQuickSubmit} className="flex flex-col gap-2.5 w-full">
                <div className="flex flex-row items-center gap-2 w-full box-border mb-0">
                  {/* 1. ช่องค้นหาสินค้า */}
                  <div className="flex-1 min-w-[200px] relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                    <input
                      type="text"
                      placeholder="ค้นหาสินค้า..."
                      value={quickSearch}
                      onChange={e => setQuickSearch(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                      className="w-full h-11 pl-9 pr-3 rounded-xl border border-black bg-white text-base md:text-sm font-normal text-black outline-none focus:border-black/40 focus:ring-1 focus:ring-black/10 transition-all antialiased"
                    />

                    {/* Custom Dropdown */}
                    {isSearchFocused && filteredItems.length > 0 && (
                      <div className="absolute top-full left-0 w-full mt-2 bg-[#fdfcf0] border border-black/5 rounded-xl shadow-xl z-[200] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="max-h-[50vh] overflow-y-auto py-2">
                          {filteredItems.map(item => (
                            <button
                              key={item.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setQuickSearch(item.name);
                                setIsSearchFocused(false);
                              }}
                              className="w-full text-left px-5 py-3 hover:bg-black/5 transition-colors flex items-center justify-between group"
                            >
                              <span className="text-[14px] text-black font-normal">{item.name}</span>
                              <span className="text-[12px] text-black/30 group-hover:text-black/50 transition-colors uppercase tracking-widest font-mono">
                                {item.stock} {item.unit}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. ยอดคงเหลือของสินค้าที่เลือกพร้อมสีไดนามิก */}
                  {selectedQuickItem && (
                    <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[14px] whitespace-nowrap shrink-0 transition-all duration-200 animate-in fade-in zoom-in-95 border ${quickBadgeStyles.bg}`}>
                      <span className={`text-[13px] ${quickBadgeStyles.label}`}>คงเหลือ:</span>
                      <span className={`font-normal antialiased font-mono ${quickBadgeStyles.val}`}>
                        {Number.isInteger(selectedQuickItem.stock) ? selectedQuickItem.stock : Number(selectedQuickItem.stock).toFixed(1)}
                      </span>
                      <span className={`text-[12px] ${quickBadgeStyles.label}`}>{selectedQuickItem.unit}</span>
                    </div>
                  )}

                  {/* 2. ช่องใส่จำนวน */}
                  <div className="w-20 md:w-24 shrink-0">
                    <input
                      type="number"
                      placeholder="จำนวน"
                      value={quickQty}
                      onChange={e => setQuickQty(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleQuickSubmit(e as any);
                        }
                      }}
                      min="0"
                      step="any"
                      className="w-full h-11 text-base md:text-sm font-normal px-2 text-center rounded-xl border border-black bg-white placeholder-neutral-400 text-black outline-none focus:border-black/40 focus:ring-1 focus:ring-black/10 transition-all antialiased"
                    />
                  </div>

                  {/* 3. สวิตช์สลับข้างสไตล์ Segmented Control */}
                  <div className="flex items-center bg-neutral-100 p-1 rounded-full border border-black shrink-0 h-11">
                    <button
                      type="button"
                      onClick={() => setQuickType('IN')}
                      className={cn("flex items-center justify-center px-3 h-full text-base md:text-sm font-normal rounded-full transition-all duration-150 antialiased", quickType === 'IN' ? "bg-white text-black shadow-sm" : "text-neutral-500 bg-transparent hover:text-black/70")}
                    >
                      <PackagePlus className={cn("w-4 h-4 mr-1.5 transition-colors", quickType === 'IN' ? "text-[#84cc16]" : "text-neutral-400")} />
                      รับเข้า
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickType('OUT')}
                      className={cn("flex items-center justify-center px-3 h-full text-base md:text-sm font-normal rounded-full transition-all duration-150 antialiased", quickType === 'OUT' ? "bg-white text-black shadow-sm" : "text-neutral-500 bg-transparent hover:text-black/70")}
                    >
                      <PackageMinus className={cn("w-4 h-4 mr-1.5 transition-colors", quickType === 'OUT' ? "text-[#f87171]" : "text-neutral-400")} />
                      นำออก
                    </button>
                  </div>

                  <button type="submit" className="px-4 h-11 bg-[#f0f9ff] border border-[#e0f2fe] hover:bg-[#bae6fd] text-[#0c4a6e] rounded-xl text-sm font-normal transition-all shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap antialiased shrink-0">
                    <CloudUpload className="w-4 h-4" strokeWidth={1.5} /> บันทึก
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 w-full box-border">
                  <button type="button" onClick={() => setShowPurchaseOrderModal(true)} className="flex items-center justify-center gap-1.5 px-1 py-2.5 bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:shadow-sm text-[#000000] rounded-3xl transition-all text-sm font-normal antialiased">
                    <ShoppingCart className="w-4 h-4 text-[#14532d]" strokeWidth={1.5} />
                    <span className="truncate">สั่งซื้อ {itemsToOrder.length > 0 && <span className="bg-[#14532d] text-white text-[10px] px-1.5 py-0.5 rounded-full font-normal">{itemsToOrder.length}</span>}</span>
                  </button>
                  <button type="button" onClick={() => setShowAddModal(true)} className="flex items-center justify-center gap-1.5 px-1 py-2.5 bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:shadow-sm text-[#000000] rounded-3xl transition-all text-sm font-normal antialiased">
                    <PlusCircle className="w-4 h-4 text-[#9a3412]" strokeWidth={1.5} />
                    <span>เพิ่มสินค้า</span>
                  </button>
                  <button type="button" onClick={handleOpenHistory} className="flex items-center justify-center gap-1.5 px-1 py-2.5 bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:shadow-sm text-[#000000] rounded-3xl transition-all text-sm font-normal antialiased">
                    <History className="w-4 h-4 text-[#5b21b6]" strokeWidth={1.5} />
                    <span>ประวัติ</span>
                  </button>
                </div>
              </form>
              {frequentItems.length > 0 && (
                <div className="flex items-center gap-2 mt-6 pt-3 border-t border-black/5 overflow-x-auto pb-1 scrollbar-hide">
                  <span className="text-[12px] text-black/40 font-normal whitespace-nowrap">รายการใช้บ่อย:</span>
                  {frequentItems.map(fi => (
                    <button key={fi.id} onClick={() => setQuickSearch(fi.name)} className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-full text-[13px] text-black/70 whitespace-nowrap transition-colors">
                      {fi.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="w-full overflow-x-auto scrollbar-thin flex flex-col pb-6">
            <div className="w-max min-w-full border border-black/5 bg-[#fdfcf0]/80 backdrop-blur-md shadow-sm rounded-3xl overflow-hidden">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStartRows}
                onDragEnd={handleDragEndRows}
                modifiers={[restrictToWindowEdges]}
              >
                <table className="table-auto border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="w-10 min-w-[40px] border-r border-slate-100 text-[10px] font-normal text-black/20 uppercase tracking-widest text-center italic">#</th>
                      <th className="w-10 min-w-[40px] border-r border-slate-100"></th>
                      {columns.map(col => (
                        <ColumnHeader
                          key={col.id}
                          col={col}
                          updateColumnLabel={updateColumnLabel}
                          saveColumnsConfig={() => saveColumnsConfig(columns)}
                          onResize={handleColumnResize}
                          onResizeEnd={handleColumnResizeEnd}
                        />
                      ))}
                    </tr>
                  </thead>
                  <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={columns.length + 1} className="p-12 text-center text-[14px] font-normal text-[#000000]">
                            ไม่มีข้อมูลสินค้าในระบบ กรุณกด "เพิ่มรายการ"
                          </td>
                        </tr>
                      ) : (
                        items.map((item, index) => (
                          <SortableRow
                            key={item.id}
                            item={item}
                            index={index}
                            columns={columns}
                            handleUpdateField={handleUpdateField}
                            handleSaveField={handleSaveField}
                            requestDelete={setDeleteId}
                            handleFocus={handleFocus}
                            totalItems={items.length}
                          />
                        ))
                      )}
                    </tbody>
                  </SortableContext>
                </table>

              </DndContext>
            </div>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] w-full max-w-xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 h-14 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-normal text-black">เพิ่มรายการใหม่</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 text-black hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleAddItemSubmit} className="p-6">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <label className="text-[12px] font-normal text-black ml-1 uppercase tracking-wider">ชื่อรายการ</label>
                    <input
                      required
                      value={newItemData.name || ''}
                      onChange={e => setNewItemData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-100 focus:border-purple-300 focus:ring-2 focus:ring-purple-100 rounded-3xl text-base md:text-sm font-normal text-black outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-normal text-slate-600 ml-1">คงเหลือ</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={newItemData.stock === null || newItemData.stock === undefined ? '' : newItemData.stock}
                      onChange={e => {
                        let val = e.target.value.replace(/[^0-9.]/g, '');
                        if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) val = val.replace(/^0+/, '');
                        setNewItemData(prev => ({ ...prev, stock: val }));
                      }}
                      className="w-full h-11 px-4 bg-[#fdfcf0]/50 border border-[#000000]/5 focus:border-[#000000]/20 rounded-3xl text-base md:text-sm font-normal text-black outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-normal text-slate-600 ml-1">หน่วย</label>
                    <input
                      value={newItemData.unit === null || newItemData.unit === undefined ? '' : newItemData.unit}
                      onChange={e => setNewItemData(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full h-11 px-4 bg-[#fdfcf0]/50 border border-[#000000]/5 focus:border-[#000000]/20 rounded-3xl text-base md:text-sm font-normal text-black outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-normal text-slate-600 ml-1">จุดสั่งซื้อ</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={newItemData.order_point === null || newItemData.order_point === undefined ? '' : newItemData.order_point}
                      onChange={e => {
                        let val = e.target.value.replace(/[^0-9.]/g, '');
                        if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) val = val.replace(/^0+/, '');
                        setNewItemData(prev => ({ ...prev, order_point: val }));
                      }}
                      className="w-full h-11 px-4 bg-[#fdfcf0]/50 border border-[#000000]/5 focus:border-[#000000]/20 rounded-3xl text-base md:text-sm font-normal text-black outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-normal text-slate-600 ml-1">จำนวนที่ต้องมี</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={newItemData.target_stock === null || newItemData.target_stock === undefined ? '' : newItemData.target_stock}
                      onChange={e => {
                        let val = e.target.value.replace(/[^0-9.]/g, '');
                        if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) val = val.replace(/^0+/, '');
                        setNewItemData(prev => ({ ...prev, target_stock: val }));
                      }}
                      className="w-full h-11 px-4 bg-[#fdfcf0]/50 border border-[#000000]/5 focus:border-[#000000]/20 rounded-3xl text-base md:text-sm font-normal text-black outline-none transition-all"
                    />
                  </div>

                  <div className="col-span-2 flex flex-col gap-1.5">
                    <label className="text-[12px] font-normal text-slate-600 ml-1">ช่องทางสั่งซื้อ</label>
                    <input
                      value={newItemData.source === null || newItemData.source === undefined ? '' : newItemData.source}
                      onChange={e => setNewItemData(prev => ({ ...prev, source: e.target.value }))}
                      className="w-full h-11 px-4 bg-[#fdfcf0]/50 border border-[#000000]/5 focus:border-[#000000]/20 rounded-3xl text-base md:text-sm font-normal text-black outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="mt-8 flex gap-3">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 px-4 bg-slate-50 hover:bg-slate-100 rounded-3xl text-[14px] font-normal text-[#000000] transition-colors">
                    ยกเลิก
                  </button>
                  <button type="submit" className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-700 rounded-3xl text-[14px] font-normal text-white transition-colors shadow-sm">
                    บันทึกข้อมูล
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Alert */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] w-full max-w-sm p-6 text-center">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-normal text-[#000000] mb-2">ต้องการลบรายการนี้ใช่หรือไม่?</h3>
              <p className="text-sm font-normal text-[#000000] mb-6">ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนได้</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-3 px-4 bg-slate-50 hover:bg-slate-100 rounded-3xl text-[14px] font-normal text-[#000000] transition-colors">
                  ยกเลิก
                </button>
                <button onClick={executeDelete} className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 rounded-3xl text-[14px] font-normal text-white transition-colors shadow-sm">
                  ลบรายการ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reconstructed Transaction History Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/20 backdrop-blur-md p-4"
            onClick={() => setShowHistoryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-[#fdfcf0] rounded-3xl shadow-[0_8px_40px_rgb(0,0,0,0.1)] w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col border border-black/5"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-8 py-6 border-b border-black/5 flex items-center justify-between bg-white/50 backdrop-blur-sm shrink-0">
                <div>
                  <h2 className="text-2xl font-normal text-[#000000] flex items-center gap-3">
                    <History className="w-6 h-6 text-black/40" />
                    ประวัติ
                  </h2>
                  <p className="text-black/40 text-[13px] mt-1 font-normal">ตรวจสอบรายการรับเข้าและนำออกย้อนหลัง</p>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-3 text-black/30 hover:text-black hover:bg-black/5 rounded-full transition-all active:scale-95"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Table Content */}
              <div className="overflow-y-auto p-8 bg-[#fdfcf0] flex-1">
                <div className="bg-white rounded-[2rem] border border-black/5 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-black/5">
                        <th className="py-5 px-6 font-normal text-black/40 text-[13px] uppercase tracking-wider text-center w-[160px]">วันที่และเวลา</th>
                        <th className="py-5 px-6 font-normal text-black/40 text-[13px] uppercase tracking-wider text-center">ชื่อรายการสินค้า</th>
                        <th className="py-5 px-6 font-normal text-black/40 text-[13px] uppercase tracking-wider text-center w-[120px]">ประเภท</th>
                        <th className="py-5 px-6 font-normal text-black/40 text-[13px] uppercase tracking-wider text-center w-[110px]">จำนวน</th>
                        <th className="py-5 px-6 font-normal text-black/40 text-[13px] uppercase tracking-wider text-center w-[110px]">คงเหลือ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.03]">
                      {transactionHistory.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-20 text-center text-black/30 text-[15px] font-normal italic">
                            <div className="flex flex-col items-center gap-3">
                              <ShoppingCart className="w-10 h-10 opacity-10" />
                              ยังไม่มีประวัติการเคลื่อนไหวในขณะนี้
                            </div>
                          </td>
                        </tr>
                      ) : (
                        transactionHistory.map((tx: any, index: number) => (
                          <motion.tr
                            key={tx.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="group hover:bg-slate-50/80 transition-colors"
                          >
                            {/* Day/Time - Left */}
                            <td className="py-3.5 px-6 text-[14px] text-black/60 font-mono text-left">
                              {new Date(tx.created_at).toLocaleString('th-TH', {
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })}
                            </td>

                            {/* Item Name - Left */}
                            <td className="py-3.5 px-6 text-[15px] text-black font-normal text-left" style={{ lineHeight: '1.6' }}>
                              {tx.inventory_items?.name || 'ไม่ทราบชื่อสินค้า'}
                            </td>

                            {/* Type - Center (Pure Iconography) */}
                            <td className="py-3.5 px-6 text-center">
                              <div className="flex justify-center">
                                <span className={cn(
                                  "w-9 h-9 rounded-2xl inline-flex items-center justify-center transition-all shadow-sm border",
                                  tx.type === 'IN'
                                    ? "bg-[#f0fdf4] text-[#14532d] border-[#dcfce7]"
                                    : "bg-[#fff1f2] text-[#9f1239] border-[#ffe4e6]"
                                )}>
                                  {tx.type === 'IN' ? <PackagePlus className="w-4.5 h-4.5" /> : <PackageMinus className="w-4.5 h-4.5" />}
                                </span>
                              </div>
                            </td>

                            {/* Quantity - Center (Mono) */}
                            <td className="py-3.5 px-6 text-[15px] text-center font-mono text-black font-normal">
                              {tx.quantity}
                            </td>

                            {/* Balance After - Center (Mono) */}
                            <td className="py-3.5 px-6 text-[15px] text-center font-mono text-black/40">
                              {tx.balance_after}
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer Info */}
              <div className="px-8 py-4 bg-white/30 border-t border-black/5 flex justify-between items-center shrink-0 text-[12px] text-black/30">
                <span>แสดง {transactionHistory.length} รายการล่าสุด</span>
                <span className="font-mono uppercase tracking-tighter"></span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Purchase Orders Modal */}
      <AnimatePresence>
        {showPurchaseOrderModal && (
          <PurchaseOrdersModal
            onClose={() => setShowPurchaseOrderModal(false)}
            exportPOImage={exportPOImage}
            selectedChannels={selectedChannels}
            setSelectedChannels={setSelectedChannels}
            itemsToOrder={itemsToOrder}
            poSources={poSources}
            displayedPoItems={displayedPoItems}
            getStockColorClass={getStockColorClass}
          />
        )}
      </AnimatePresence>
    </>
  );
}