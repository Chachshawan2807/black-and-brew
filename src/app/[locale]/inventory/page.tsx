'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, useTransition } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Loader2, GripVertical, Undo2, Redo2, Trash2, X, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toPng } from 'html-to-image';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { recordTransaction, fetchTransactionHistory, fetchFrequentItems, deleteInventoryItem, deleteInventoryItemsBulk, updateInventoryStock } from '@/app/actions/inventory-actions';
import { logClientDataChange } from '@/lib/client-data-change-log';
import { getClientSessionId } from '@/lib/client-session';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import { computeItemsToOrder, getQuickBadgeStyles, getStockColorClass, mergeInventoryRealtimeUpdate } from '@/lib/inventory-stock';
import { InventoryQuickActionBar } from '@/components/inventory/InventoryQuickActionBar';
import { InventoryHistoryModal } from '@/components/inventory/InventoryHistoryModal';
import {
  DndContext,
  closestCorners,
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
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { useSafeDndSensors } from '@/lib/dnd-sensors';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { useReadOnly, READ_ONLY_DENY_MSG } from '@/components/providers/AuthProvider';
import { ExportProgressOverlay } from '@/components/ui/ExportProgressOverlay';

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
  { id: 'sort_order', label: 'ลำดับ', width: '60px', type: 'number' },
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
          className="bg-transparent border-none focus:outline-none focus:bg-card/50 text-[13px] font-normal text-foreground/60 uppercase tracking-wider cursor-text px-2 py-1 rounded-xl text-center w-full"
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

/**
 * Inline editable sort-order badge.
 * Click/tap to enter edit mode; blur or Enter commits via handleSaveField.
 */
function EditableSortIndex({ id, displayIndex, totalItems, handleSaveField }: {
  id: string;
  displayIndex: number;
  totalItems: number;
  handleSaveField: (id: string, field: string, value: any) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [localVal, setLocalVal] = React.useState('');

  const commit = () => {
    setEditing(false);
    const raw = localVal.replace(/^0+(?=\d)/, '');
    const num = raw === '' ? displayIndex : Number(raw);
    if (!isNaN(num) && num >= 1 && num <= totalItems) {
      handleSaveField(id, 'sort_order', num);
    }
  };

  if (editing) {
    return (
      <input
        data-testid="sort-order-input"
        autoFocus
        type="text"
        inputMode="numeric"
        value={localVal}
        onChange={e => {
          let v = e.target.value.replace(/[^0-9]/g, '');
          v = v.replace(/^0+(?=\d)/, '');
          setLocalVal(v);
        }}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') setEditing(false);
        }}
        className="w-8 h-5 text-[12px] font-mono text-center bg-muted border border-border rounded focus:outline-none focus:ring-1 focus:ring-foreground/20 shrink-0"
        style={{ width: '2rem' }}
      />
    );
  }

  return (
    <button
      data-testid="sort-order-input"
      type="button"
      title={`แตะเพื่อเปลี่ยนลำดับ (1–${totalItems})`}
      onClick={() => { setLocalVal(String(displayIndex)); setEditing(true); }}
      className="text-[12px] font-normal text-foreground/35 font-mono shrink-0 hover:text-foreground/60 hover:bg-muted rounded px-1 transition-colors leading-none cursor-pointer"
    >
      {displayIndex.toString().padStart(2, '0')}
    </button>
  );
}

const SortableRow = React.memo(({ item, index: rowIndex, columns, handleUpdateField, handleSaveField, requestDelete, handleFocus, totalItems }: {
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

  const stock = Number(item.stock) || 0;
  const orderPoint = Number(item.order_point) || 0;
  const targetStock = Number(item.target_stock) || 0;
  const computedOrderQty = stock <= orderPoint ? Math.max(0, targetStock - stock) : 0;

  const stockCol = columns.find(c => c.id === 'stock')!;
  const orderPointCol = columns.find(c => c.id === 'order_point')!;
  const targetStockCol = columns.find(c => c.id === 'target_stock')!;
  const unitCol = columns.find(c => c.id === 'unit')!;
  const sourceCol = columns.find(c => c.id === 'source')!;

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: dndTransition || 'transform 150ms cubic-bezier(0.2, 0, 0, 1)',
    zIndex: isDragging ? 100 : 1,
    willChange: 'transform',
  };

  return (
    <div
      ref={setNodeRef}
      data-inventory-item-id={item.id}
      style={style}
      className={cn(
        "bg-card border border-border rounded-2xl p-3.5 shadow-sm space-y-2.5 flex flex-col transition-all duration-200",
        isDragging && "opacity-80 scale-[1.02] shadow-2xl ring-2 ring-foreground/10 cursor-grabbing"
      )}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <EditableSortIndex
            id={item.id}
            displayIndex={rowIndex + 1}
            totalItems={totalItems}
            handleSaveField={handleSaveField}
          />
          <EditableCell
            item={item}
            col={columns.find(c => c.id === 'name')!}
            rowIndex={rowIndex}
            handleUpdateField={handleUpdateField}
            handleSaveField={handleSaveField}
            requestDelete={requestDelete}
            handleFocus={handleFocus}
            cardMode
          />
        </div>
        {/* Grip Handle */}
        <div
          className="cursor-grab active:cursor-grabbing text-foreground/20 hover:text-foreground/50 transition-colors shrink-0 touch-none min-h-[44px] min-w-[44px] flex items-center justify-center"
          {...attributes}
          {...listeners}
          aria-label="ลากเพื่อเปลี่ยนลำดับ"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      </div>

      {/* Card Body: Stats Grid */}
      <div className="grid grid-cols-6 gap-1 pt-0.5">
        {/* Stock */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[9px] text-foreground/45 font-normal uppercase tracking-tight text-center truncate">
            {columns.find(c => c.id === 'stock')?.label || 'คงเหลือ'}
          </span>
          {stockCol && (
            <EditableCell
              item={item}
              col={stockCol}
              rowIndex={rowIndex}
              handleUpdateField={handleUpdateField}
              handleSaveField={handleSaveField}
              requestDelete={requestDelete}
              handleFocus={handleFocus}
              cardMode
            />
          )}
        </div>

        {/* Order Qty (Computed Read-only) */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[9px] text-foreground/45 font-normal uppercase tracking-tight text-center truncate">
            {columns.find(c => c.id === 'order_qty')?.label || 'สั่งซื้อ'}
          </span>
          <div className="w-full h-8 px-1 rounded-lg bg-muted border border-border flex items-center justify-center text-[13px] font-normal text-muted-foreground select-none font-mono truncate">
            {computedOrderQty === 0 ? '-' : computedOrderQty}
          </div>
        </div>

        {/* Order Point */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[9px] text-foreground/45 font-normal uppercase tracking-tight text-center truncate">
            {columns.find(c => c.id === 'order_point')?.label || 'จุดสั่ง'}
          </span>
          {orderPointCol && (
            <EditableCell
              item={item}
              col={orderPointCol}
              rowIndex={rowIndex}
              handleUpdateField={handleUpdateField}
              handleSaveField={handleSaveField}
              requestDelete={requestDelete}
              handleFocus={handleFocus}
              cardMode
            />
          )}
        </div>

        {/* Target Stock */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[9px] text-foreground/45 font-normal uppercase tracking-tight text-center truncate">
            {columns.find(c => c.id === 'target_stock')?.label || 'ต้องมี'}
          </span>
          {targetStockCol && (
            <EditableCell
              item={item}
              col={targetStockCol}
              rowIndex={rowIndex}
              handleUpdateField={handleUpdateField}
              handleSaveField={handleSaveField}
              requestDelete={requestDelete}
              handleFocus={handleFocus}
              cardMode
            />
          )}
        </div>

        {/* Unit */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[9px] text-foreground/45 font-normal uppercase tracking-tight text-center truncate">
            {columns.find(c => c.id === 'unit')?.label || 'หน่วย'}
          </span>
          {unitCol && (
            <EditableCell
              item={item}
              col={unitCol}
              rowIndex={rowIndex}
              handleUpdateField={handleUpdateField}
              handleSaveField={handleSaveField}
              requestDelete={requestDelete}
              handleFocus={handleFocus}
              cardMode
            />
          )}
        </div>

        {/* Source */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[9px] text-foreground/45 font-normal uppercase tracking-tight text-center truncate">
            {columns.find(c => c.id === 'source')?.label || 'ช่องทาง'}
          </span>
          {sourceCol && (
            <EditableCell
              item={item}
              col={sourceCol}
              rowIndex={rowIndex}
              handleUpdateField={handleUpdateField}
              handleSaveField={handleSaveField}
              requestDelete={requestDelete}
              handleFocus={handleFocus}
              cardMode
            />
          )}
        </div>
      </div>
    </div>
  );
});

SortableRow.displayName = 'SortableRow';

const MobileSortableRow = React.memo(({ item, index, totalItems, columns, handleUpdateField, handleSaveField, requestDelete, handleFocus, getStockColorClass }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: transition || 'transform 150ms cubic-bezier(0.2, 0, 0, 1)',
    zIndex: isDragging ? 100 : 1,
    willChange: 'transform',
  };

  const stock = Number(item.stock) || 0;
  const orderPoint = Number(item.order_point) || 0;
  const targetStock = Number(item.target_stock) || 0;
  const computedOrderQty = stock <= orderPoint ? Math.max(0, targetStock - stock) : 0;

  return (
    <div
      ref={setNodeRef}
      data-inventory-item-id={item.id}
      style={style}
      className={cn(
        "w-full min-w-0 bg-card border border-border rounded-2xl p-3.5 shadow-sm space-y-2.5 flex flex-col transition-all duration-200",
        isDragging && "opacity-80 scale-[1.02] shadow-2xl ring-2 ring-foreground/10 cursor-grabbing"
      )}
    >
      {/* Card Header: Item Index, Item Name (Editable), Grip Handle, Delete Button */}
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Grip Handle */}
          <div
            className="cursor-grab active:cursor-grabbing text-foreground/20 hover:text-foreground/50 transition-colors shrink-0 touch-none min-h-[44px] min-w-[44px] flex items-center justify-center"
            {...attributes}
            {...listeners}
            aria-label="ลากเพื่อเปลี่ยนลำดับ"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <EditableSortIndex
            id={item.id}
            displayIndex={index + 1}
            totalItems={totalItems}
            handleSaveField={handleSaveField}
          />
          <input
            type="text"
            defaultValue={item.name}
            onBlur={(e) => {
              handleUpdateField(item.id, 'name', e.target.value);
              handleSaveField(item.id, 'name', e.target.value);
            }}
            className="flex-1 bg-transparent border-none text-base text-foreground font-normal focus:bg-muted focus:outline-none rounded px-1.5 py-0.5 min-w-0"
            placeholder="ชื่อสินค้า"
          />
        </div>
        <button
          type="button"
          onClick={() => requestDelete(item.id)}
          aria-label="Delete inventory item"
          className="p-1.5 text-foreground/20 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Card Body: Single Row Grid */}
      <div className="grid grid-cols-6 gap-1 pt-1 min-w-0 overflow-hidden">
        {/* Stock */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[9px] text-foreground/45 font-normal uppercase tracking-tight text-center truncate">คงเหลือ</span>
          <MobileEditableCell
            item={item}
            col={columns.find((c: any) => c.id === 'stock')!}
            rowIndex={index}
            handleUpdateField={handleUpdateField}
            handleSaveField={handleSaveField}
            handleFocus={handleFocus}
            className={cn(
              "w-full h-8 px-1 rounded-lg border border-border bg-muted text-[13px] font-normal text-center focus:bg-card focus:outline-none focus:ring-1 focus:ring-foreground/10 transition-all font-mono truncate",
              getStockColorClass(stock, targetStock)
            )}
          />
        </div>

        {/* Order Qty (Computed / Read-only) */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[9px] text-foreground/45 font-normal uppercase tracking-tight text-center truncate">สั่งซื้อ</span>
          <div className="w-full h-8 px-1 rounded-lg bg-muted border border-border flex items-center justify-center text-[13px] font-normal text-muted-foreground select-none font-mono truncate">
            {computedOrderQty === 0 ? '-' : computedOrderQty}
          </div>
        </div>

        {/* Order Point */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[9px] text-foreground/45 font-normal uppercase tracking-tight text-center truncate">จุดสั่ง</span>
          <MobileEditableCell
            item={item}
            col={columns.find((c: any) => c.id === 'order_point')!}
            rowIndex={index}
            handleUpdateField={handleUpdateField}
            handleSaveField={handleSaveField}
            handleFocus={handleFocus}
            className="w-full h-8 px-1 rounded-lg border border-border bg-muted text-[13px] font-normal text-center focus:bg-card focus:outline-none focus:ring-1 focus:ring-foreground/10 transition-all font-mono truncate"
          />
        </div>

        {/* Target Stock */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[9px] text-foreground/45 font-normal uppercase tracking-tight text-center truncate">ต้องมี</span>
          <MobileEditableCell
            item={item}
            col={columns.find((c: any) => c.id === 'target_stock')!}
            rowIndex={index}
            handleUpdateField={handleUpdateField}
            handleSaveField={handleSaveField}
            handleFocus={handleFocus}
            className="w-full h-8 px-1 rounded-lg border border-border bg-muted text-[13px] font-normal text-center focus:bg-card focus:outline-none focus:ring-1 focus:ring-foreground/10 transition-all font-mono truncate"
          />
        </div>

        {/* Unit */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[9px] text-foreground/45 font-normal uppercase tracking-tight text-center truncate">หน่วย</span>
          <input
            type="text"
            defaultValue={item.unit}
            onBlur={(e) => {
              handleUpdateField(item.id, 'unit', e.target.value);
              handleSaveField(item.id, 'unit', e.target.value);
            }}
            className="w-full h-8 px-1 rounded-lg border border-border bg-muted text-[13px] font-normal text-center focus:bg-card focus:outline-none focus:ring-1 focus:ring-foreground/10 transition-all truncate"
            placeholder="หน่วย"
          />
        </div>

        {/* Source */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[9px] text-foreground/45 font-normal uppercase tracking-tight text-center truncate">ช่องทาง</span>
          <input
            type="text"
            defaultValue={item.source}
            onBlur={(e) => {
              handleUpdateField(item.id, 'source', e.target.value);
              handleSaveField(item.id, 'source', e.target.value);
            }}
            className="w-full h-8 px-1 rounded-lg border border-border bg-muted text-[13px] font-normal text-center focus:bg-card focus:outline-none focus:ring-1 focus:ring-foreground/10 transition-all truncate"
            placeholder="ช่องทาง"
          />
        </div>
      </div>
    </div>
  );
});

MobileSortableRow.displayName = 'MobileSortableRow';

const PurchaseOrdersModal = dynamic(() => import('./PurchaseOrdersModal'), { ssr: false });

function EditableCell({ item, col, rowIndex, handleUpdateField, handleSaveField, requestDelete, handleFocus, cardMode }: any) {
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
    if (col.id === 'name') return 'text-left pr-10 text-foreground';
    if (col.id === 'stock') return `text-center ${getStockColorClass(Number(item.stock) || 0, Number(item.target_stock) || 0)}`;
    if (col.id === 'order_qty') return 'text-center text-foreground';
    return 'text-center text-foreground/60';
  };

  // cardMode: render as compact cell for card layout (Desktop + Mobile unified)
  if (cardMode) {
    if (col.id === 'name') {
      return (
        <div className="flex items-center relative flex-1 min-w-0">
          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            defaultValue={localValue}
            onFocus={() => { setIsFocused(true); handleFocus(); }}
            onBlur={handleBlur}
            data-col-id={col.id}
            data-row-index={rowIndex}
            className="flex-1 min-w-0 bg-transparent border-none text-base text-foreground font-normal focus:bg-muted focus:outline-none rounded px-1.5 py-0.5 truncate"
            placeholder="ชื่อสินค้า"
          />
          <button
            onClick={() => requestDelete(item.id)}
            aria-label="Delete"
            className="ml-1 p-1 text-foreground/20 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode={col.type === 'number' ? 'decimal' : 'text'}
        defaultValue={localValue}
        onFocus={() => { setIsFocused(true); handleFocus(); }}
        onBlur={handleBlur}
        data-col-id={col.id}
        data-row-index={rowIndex}
        readOnly={col.id === 'order_qty'}
        className={cn(
          "w-full h-8 px-1 rounded-lg border border-border bg-muted text-[13px] font-normal text-center focus:bg-card focus:outline-none focus:ring-1 focus:ring-foreground/10 transition-all font-mono truncate",
          col.id === 'stock' && getStockColorClass(Number(item.stock) || 0, Number(item.target_stock) || 0),
          col.id === 'order_qty' && 'bg-muted border-border text-muted-foreground cursor-not-allowed'
        )}
      />
    );
  }

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
            e.preventDefault();
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
        className={`w-full px-4 py-4 pt-5 pb-3 min-h-[56px] bg-transparent border-none focus:outline-none focus:bg-muted/80 text-base md:text-sm font-normal leading-[1.6] transition-all ${getAlignmentAndColor()} ${col.type === 'number' ? 'font-mono' : ''} ${col.id === 'order_qty' ? 'bg-muted cursor-not-allowed select-none' : ''}`}
      />
      {col.id === 'name' && (
        <button
          onClick={() => requestDelete(item.id)}
          aria-label="Delete inventory item"
          className="absolute right-3 p-1.5 text-foreground/20 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover/cell:opacity-100"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function MobileEditableCell({ item, col, rowIndex, handleUpdateField, handleSaveField, handleFocus, className }: any) {
  const [localValue, setLocalValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      let val = item[col.id];

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

    handleUpdateField(item.id, col.id, finalVal);
    handleSaveField(item.id, col.id, finalVal);
  };

  return (
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
          e.preventDefault();
          e.currentTarget.blur();
          const nextRowInput = document.querySelector(`input[data-mobile-col-id="${col.id}"][data-mobile-row-index="${rowIndex + 1}"]`) as HTMLInputElement;
          if (nextRowInput) {
            setTimeout(() => {
              nextRowInput.focus();
              nextRowInput.select();
            }, 10);
          }
        }
      }}
      data-mobile-col-id={col.id}
      data-mobile-row-index={rowIndex}
      readOnly={col.id === 'order_qty'}
      className={className}
    />
  );
}

export default function DynamicInventoryManager() {
  const router = useRouter();
  const isReadOnly = useReadOnly();

  const blockIfReadOnly = () => {
    if (isReadOnly) {
      alert(READ_ONLY_DENY_MSG);
      return true;
    }
    return false;
  };
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [columns, setColumns] = useState<ColumnDef[]>(defaultColumns);
  const [loading, setLoading] = useState(true);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'synced'>('idle');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPurchaseOrderModal, setShowPurchaseOrderModal] = useState(false);
  const [isExportingPO, setIsExportingPO] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['all']);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  // Add Form State
  const [newItemData, setNewItemData] = useState<Partial<InventoryItem>>({});
  const [newItemInsertPosition, setNewItemInsertPosition] = useState<string>('');

  // History State
  const [undoStack, setUndoStack] = useState<{ items: InventoryItem[], cols: ColumnDef[] }[]>([]);
  const [redoStack, setRedoStack] = useState<{ items: InventoryItem[], cols: ColumnDef[] }[]>([]);
  const previousStateRef = useRef<{ items: InventoryItem[], cols: ColumnDef[] }>({ items: [], cols: defaultColumns });

  const sensors = useSafeDndSensors();

  // Quick Entry State
  const [quickSearch, setQuickSearch] = useState('');
  const [debouncedQuickSearch, setDebouncedQuickSearch] = useState('');
  const [quickQty, setQuickQty] = useState('');
  const [quickType, setQuickType] = useState<'IN' | 'OUT' | 'ADJUST'>('IN');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [frequentItems, setFrequentItems] = useState<{ id: string, name: string }[]>([]);
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
  const [isQuickPending, startQuickTransition] = useTransition();

  const itemsToOrder = useMemo(() => computeItemsToOrder(items), [items]);

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
    const element = document.getElementById('blackandbrew-po-table-export');
    if (!element) return;
    try {
      setIsExportingPO(true);
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
      const channelSuffix = selectedChannels.includes('all')
        ? 'All'
        : selectedChannels.join('-');
      const link = document.createElement('a');
      link.download = `PurchaseOrders-${channelSuffix}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export PO image:', err);
    } finally {
      setIsExportingPO(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!debouncedQuickSearch) return [];
    const needle = debouncedQuickSearch.toLowerCase();
    return items.filter(item =>
      item.name.toLowerCase().includes(needle)
    ).slice(0, 10);
  }, [items, debouncedQuickSearch]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuickSearch(quickSearch), 150);
    return () => window.clearTimeout(t);
  }, [quickSearch]);

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
          setItems(prev => prev.map(item =>
            item.id === payload.new.id
              ? mergeInventoryRealtimeUpdate(item, payload.new as InventoryItem)
              : item
          ));
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

  // Refresh from DB when PO modal opens so stock matches other windows
  useEffect(() => {
    if (showPurchaseOrderModal) {
      void fetchConfigAndInventory();
    }
  }, [showPurchaseOrderModal]);

  useEffect(() => {
    previousStateRef.current = { items, cols: columns };
  }, [items, columns]);

  useEffect(() => {
    if (loading || typeof window === 'undefined') return;
    const highlightId = new URLSearchParams(window.location.search).get('highlight');
    if (!highlightId) return;
    const el = document.querySelector(`[data-inventory-item-id="${highlightId}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-amber-500/50');
    const timer = window.setTimeout(() => {
      el.classList.remove('ring-2', 'ring-amber-500/50');
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [loading, items]);

  async function fetchConfigAndInventory() {
    try {
      await ensureSupabaseSession();
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
    const numericFields = ['stock', 'order_qty', 'order_point', 'target_stock', 'sort_order'];

    numericFields.forEach(field => {
      if (sanitized[field] === '' || sanitized[field] === null || sanitized[field] === undefined || isNaN(Number(sanitized[field]))) {
        sanitized[field] = 0;
      } else {
        sanitized[field] = Number(sanitized[field]);
      }
    });

    // คง updated_at เดิมไว้ ไม่ลบทิ้ง เพื่อไม่ให้ Supabase reset เป็น NOW() (UTC)
    if (!sanitized.updated_at) {
      sanitized.updated_at = new Date().toISOString();
    }
    return sanitized;
  }

  function pushHistory() {
    setUndoStack(prev => [...prev, previousStateRef.current]);
    setRedoStack([]);
  }

  async function handleAddItemSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (blockIfReadOnly()) return;
    pushHistory();

    // Determine insertion position
    const rawPos = newItemInsertPosition === '' ? items.length + 1 : Number(newItemInsertPosition);
    const insertPos = isNaN(rawPos) ? items.length + 1 : Math.max(1, Math.min(items.length + 1, rawPos));
    const isAppend = insertPos >= items.length + 1;

    const newItem = {
      name: newItemData.name || '',
      stock: (newItemData.stock as unknown as string === "" || newItemData.stock === undefined || newItemData.stock === null) ? 0 : Number(newItemData.stock),
      order_qty: (newItemData.order_qty as unknown as string === "" || newItemData.order_qty === undefined || newItemData.order_qty === null) ? 0 : Number(newItemData.order_qty),
      order_point: (newItemData.order_point as unknown as string === "" || newItemData.order_point === undefined || newItemData.order_point === null) ? 0 : Number(newItemData.order_point),
      target_stock: (newItemData.target_stock as unknown as string === "" || newItemData.target_stock === undefined || newItemData.target_stock === null) ? 0 : Number(newItemData.target_stock),
      unit: newItemData.unit || '',
      source: newItemData.source || '',
      sort_order: insertPos
    };

    const tempId = crypto.randomUUID();

    // Optimistic update: pre-compute renumbered array so we have it for DB sync
    let renumberedItems: InventoryItem[];
    if (isAppend) {
      renumberedItems = [...items, { ...newItem, id: tempId }];
    } else {
      const sorted = [...items].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      sorted.splice(insertPos - 1, 0, { ...newItem, id: tempId });
      renumberedItems = sorted.map((item, idx) => ({ ...item, sort_order: idx + 1 }));
    }

    setItems(renumberedItems);
    setShowAddModal(false);
    setNewItemData({});
    setNewItemInsertPosition('');

    try {
      setSavingState('saving');

      if (isAppend) {
        // Original append path: trust DB max sort_order to avoid race conditions
        const { data: maxOrderData, error: maxOrderErr } = await supabase
          .from('inventory_items')
          .select('sort_order')
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle();

        const nextSortOrder = (maxOrderErr || !maxOrderData) ? insertPos : (maxOrderData.sort_order || 0) + 1;
        const dbNewItem = { ...newItem, sort_order: nextSortOrder };

        const { data, error } = await supabase
          .from('inventory_items')
          .insert([dbNewItem])
          .select()
          .single();

        if (error) throw error;
        setItems(prev => prev.map(item => item.id === tempId ? data : item));
        logClientDataChange({
          action: 'CREATE',
          module: 'inventory',
          entityType: 'inventory_item',
          entityId: data.id,
          entityLabel: data.name,
          after: data,
        });
      } else {
        // Insert-at-position path: insert new item, then sync all displaced sort_orders
        const newItemSortOrder = renumberedItems.find(i => i.id === tempId)?.sort_order ?? insertPos;
        const dbNewItem = { ...newItem, sort_order: newItemSortOrder };

        const { data, error } = await supabase
          .from('inventory_items')
          .insert([dbNewItem])
          .select()
          .single();

        if (error) throw error;

        // Replace tempId with real DB id, preserve sort_order from renumbered list
        const finalItems = renumberedItems.map(i =>
          i.id === tempId ? { ...data, sort_order: i.sort_order } : i
        );
        setItems(finalItems);

        // Sync all sort_orders to Supabase (renumbered items that were displaced)
        const { error: upsertError } = await supabase.from('inventory_items').upsert(
          finalItems.map(i => ({ id: i.id, sort_order: i.sort_order }))
        );
        if (upsertError) throw upsertError;
        logClientDataChange({
          action: 'CREATE',
          module: 'inventory',
          entityType: 'inventory_item',
          entityId: data.id,
          entityLabel: data.name,
          after: data,
          metadata: { insertPosition: insertPos },
        });
      }

      setSavingState('synced');
      setTimeout(() => setSavingState('idle'), 2000);
    } catch (err: any) {
      console.error('Failed to add item:', err.message || err);
      setItems(prev => prev.filter(item => item.id !== tempId));
      setSavingState('idle');
    }
  }

  async function executeDelete() {
    if (blockIfReadOnly()) return;
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
      const res = await deleteInventoryItem(deleteId, { clientSessionId: getClientSessionId() });
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
    if (blockIfReadOnly()) return;
    setIsEditing(false);
    const original = previousStateRef.current.items.find(i => i.id === id);

    // Special handling for sort_order!
    if (field === 'sort_order') {
      // Step 1: Validate input
      const numValue = Number(value);
      const totalItems = items.length;
      
      // Check if valid number, >= 1, <= totalItems
      if (isNaN(numValue) || numValue < 1 || numValue > totalItems) {
        alert(`กรุณาป้อนตัวเลขลำดับที่ถูกต้อง (1 ถึง ${totalItems})`);
        // Reset the value to original
        setItems(prev => prev.map(item => item.id === id ? { ...item, sort_order: original?.sort_order || item.sort_order } : item));
        return;
      }

      // Step 2: Get current items sorted by sort_order to find current position
      const currentSorted = [...items].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      const currentIndex = currentSorted.findIndex(i => i.id === id);
      const targetIndex = numValue - 1; // convert to 0-based

      // Step 3: Reorder the array
      const newSorted = [...currentSorted];
      const [movedItem] = newSorted.splice(currentIndex, 1);
      newSorted.splice(targetIndex, 0, movedItem);

      // Step 4: Renumber all sort_order to be consecutive 1-based
      const renumberedItems = newSorted.map((item, index) => ({ ...item, sort_order: index + 1 }));

      pushHistory();
      setItems(renumberedItems);
      setSavingState('saving');

      // Step 5: Sync all updated sort_orders to Supabase
      try {
        const { error } = await supabase.from('inventory_items').upsert(
          renumberedItems.map(item => ({ id: item.id, sort_order: item.sort_order }))
        );
        if (error) throw error;
        setSavingState('synced');
        setTimeout(() => setSavingState('idle'), 2000);
      } catch (err: any) {
        console.error('Failed to update sort_order:', err.message || err);
        setSavingState('idle');
        fetchConfigAndInventory(); // rollback on error
      }
      return;
    }

    // Normal handling for other fields
    let sanitizedValue = value;
    const numericFields = ['stock', 'order_qty', 'order_point', 'target_stock'];
    if (numericFields.includes(field)) {
      sanitizedValue = value === '' || value === null || value === undefined ? 0 : Number(value);
      if (isNaN(sanitizedValue as number)) sanitizedValue = 0;
    }

    // Prevent redundant saves: compare with original value to avoid unnecessary updated_at changes
    if (original) {
      if (numericFields.includes(field)) {
        if (Number(original[field]) === Number(sanitizedValue)) return;
      } else {
        if (String(original[field] || '') === String(sanitizedValue || '')) return;
      }
    }

    pushHistory();
    setSavingState('saving');

    try {
      if (field === 'stock') {
        const result = await updateInventoryStock(id, sanitizedValue as number, 'Warehouse edit', {
          clientSessionId: getClientSessionId(),
        });
        if (!result.success) throw new Error(result.error);
        handleUpdateField(id, 'stock', result.newStock ?? sanitizedValue);
      } else {
        const { error } = await supabase
          .from('inventory_items')
          .update({ [field]: sanitizedValue, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (error) throw error;
        logClientDataChange({
          action: 'UPDATE',
          module: 'inventory',
          entityType: 'inventory_item',
          entityId: id,
          entityLabel: original?.name,
          before: original ? { [field]: original[field] } : null,
          after: { [field]: sanitizedValue },
          fields: [field],
        });
      }
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
    if (blockIfReadOnly()) return;
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
      logClientDataChange({
        action: 'UPDATE',
        module: 'inventory',
        entityType: 'inventory_config',
        entityId: 'column_labels',
        entityLabel: 'Column settings',
        after: settings,
      });
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
    if (blockIfReadOnly()) return;
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
      logClientDataChange({
        action: 'BULK_UPDATE',
        module: 'inventory',
        entityType: 'inventory_item',
        metadata: {
          operation: 'reorder_rows',
          itemIds: updatedItems.map((item) => item.id),
        },
      });
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
    if (blockIfReadOnly()) return;
    setSavingState('saving');
    setIsSyncing(true);
    try {
      const sanitizedItems = currentItems.map((item, index) => sanitizeInventoryItem({ ...item, sort_order: index + 1 }));
      if (sanitizedItems.length > 0) {
        // Preserve live stock from DB — undo/redo must not clobber concurrent stock edits
        const { data: liveStocks } = await supabase
          .from('inventory_items')
          .select('id, stock, updated_at')
          .in('id', sanitizedItems.map(i => i.id));

        const stockById = new Map(
          (liveStocks || []).map(row => [row.id, { stock: row.stock, updated_at: row.updated_at }])
        );

        const upsertPayload = sanitizedItems.map(item => {
          const live = stockById.get(item.id);
          return {
            id: item.id,
            name: item.name,
            order_qty: item.order_qty,
            order_point: item.order_point,
            target_stock: item.target_stock,
            unit: item.unit,
            source: item.source,
            sort_order: item.sort_order,
            stock: live?.stock ?? item.stock,
            updated_at: live?.updated_at ?? item.updated_at,
          };
        });

        const { error: upsertErr } = await supabase.from('inventory_items').upsert(upsertPayload);
        if (upsertErr) throw upsertErr;
      }

      const { data: dbItems } = await supabase.from('inventory_items').select('id');
      if (dbItems) {
        const snapshotIds = sanitizedItems.map(i => i.id);
        const toDelete = dbItems.filter(dbI => !snapshotIds.includes(dbI.id)).map(i => i.id);
        if (toDelete.length > 0) {
          const delResult = await deleteInventoryItemsBulk(toDelete, {
            clientSessionId: getClientSessionId(),
          });
          if (!delResult.success) throw new Error(delResult.error);
        }
      }

      const settings = {
        order: currentCols.map(c => c.id),
        labels: currentCols.reduce((acc, c) => ({ ...acc, [c.id]: c.label }), {})
      };
      await supabase.from('inventory_config').upsert({ id: 'column_labels', settings });

      logClientDataChange({
        action: 'BULK_UPDATE',
        module: 'inventory',
        entityType: 'inventory_item',
        metadata: {
          operation: 'undo_redo_sync',
          itemCount: sanitizedItems.length,
        },
      });

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
    if (blockIfReadOnly()) return;
    if (undoStack.length === 0 || isSyncing) return;
    const lastState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, previousStateRef.current]);
    setItems(lastState.items);
    setColumns(lastState.cols);
    await syncFullStateToDB(lastState.items, lastState.cols);
  }

  async function handleRedo() {
    if (blockIfReadOnly()) return;
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
    if (blockIfReadOnly()) return;
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

  const handleQuickSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert(READ_ONLY_DENY_MSG);
      return;
    }
    if (!quickSearch || !quickQty) return;

    const item = items.find(i => i.name === quickSearch || i.id === quickSearch);
    if (!item) {
      alert('ไม่พบสินค้าที่ระบุค่ะ');
      return;
    }

    const qty = Number(quickQty);
    if (quickType === 'ADJUST') {
      if (isNaN(qty) || qty < 0) {
        alert('กรุณาระบุจำนวนคงเหลือที่ถูกต้องค่ะ');
        return;
      }
    } else if (isNaN(qty) || qty <= 0) {
      alert('กรุณาระบุจำนวนที่ถูกต้องค่ะ');
      return;
    }

    startQuickTransition(() => {
      void (async () => {
        setSavingState('saving');

        const res =
          quickType === 'ADJUST'
            ? await updateInventoryStock(item.id, qty, 'Quick Entry - Adjust', {
                clientSessionId: getClientSessionId(),
              })
            : await recordTransaction(item.id, quickType, qty, 'Quick Entry', {
                clientSessionId: getClientSessionId(),
              });

        if (!res.success) {
          alert(res.error);
          setSavingState('idle');
          return;
        }

        setItems(prev => prev.map(i => i.id === item.id ? { ...i, stock: res.newStock } : i));
        setQuickSearch('');
        setDebouncedQuickSearch('');
        setQuickQty('');
        setSavingState('synced');
        router.refresh();
        setTimeout(() => setSavingState('idle'), 2000);
        loadFrequentItems();
        if (showHistoryModal) {
          const histRes = await fetchTransactionHistory();
          if (histRes.success && histRes.data) {
            setTransactionHistory(histRes.data);
          }
        }
      })();
    });
  }, [isReadOnly, quickSearch, quickQty, items, quickType, router, showHistoryModal]);

  const selectedQuickItem = useMemo(
    () => items.find(i => i.name === quickSearch || i.id === quickSearch),
    [items, quickSearch]
  );

  const quickBadgeStyles = useMemo(() => {
    if (!selectedQuickItem) return getQuickBadgeStyles(0, 0);
    return getQuickBadgeStyles(
      Number(selectedQuickItem.stock) || 0,
      Number(selectedQuickItem.target_stock) || 0,
    );
  }, [selectedQuickItem]);

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-transparent text-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-foreground" strokeWidth={1.5} />
        <span className="font-normal text-sm uppercase tracking-widest text-foreground">กำลังซิงค์ข้อมูล...</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 w-full max-w-full bg-transparent text-foreground font-normal transition-all duration-300 flex flex-col items-center md:items-start p-4 md:p-8 overflow-x-hidden">
        <div className="w-full md:w-fit mx-auto flex flex-col items-stretch md:items-start">
          <div className="w-full flex flex-col items-center mb-8 text-center">
            <motion.h1
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="text-3xl font-normal tracking-[0.2em] text-foreground uppercase"
            >
              คลังสินค้า
            </motion.h1>
          </div>

          <div className="w-full flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 md:px-2">
            <div className="flex items-center gap-1.5 text-sm font-normal min-w-[70px]">
              {savingState === 'saving' && (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-foreground" />
                  <span className="text-foreground">กำลังซิงค์ข้อมูลอยู่ค่ะ</span>
                </>
              )}
              {savingState === 'synced' && (
                <span className="text-emerald-500">✓ ซิงค์ข้อมูลแล้วค่ะ</span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 border-r border-slate-200 pr-4 mr-2">
                <button
                  onClick={handleUndo}
                  disabled={isReadOnly || undoStack.length === 0 || isSyncing}
                  className={`p-2.5 rounded-3xl transition-all ${undoStack.length === 0 || isSyncing
                    ? 'text-[#94a3b8] cursor-default'
                    : 'text-foreground hover:bg-black/5'
                    }`}
                  title="ย้อนกลับ (Undo)"
                >
                  <Undo2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={isReadOnly || redoStack.length === 0 || isSyncing}
                  className={`p-2.5 rounded-3xl transition-all ${redoStack.length === 0 || isSyncing
                    ? 'text-[#94a3b8] cursor-default'
                    : 'text-foreground hover:bg-black/5'
                    }`}
                  title="ทำซ้ำ (Redo)"
                >
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>


            </div>
          </div>

          <InventoryQuickActionBar
            quickSearch={quickSearch}
            setQuickSearch={setQuickSearch}
            quickQty={quickQty}
            setQuickQty={setQuickQty}
            quickType={quickType}
            setQuickType={setQuickType}
            isSearchFocused={isSearchFocused}
            setIsSearchFocused={setIsSearchFocused}
            filteredItems={filteredItems}
            selectedQuickItem={selectedQuickItem}
            quickBadgeStyles={quickBadgeStyles}
            frequentItems={frequentItems}
            itemsToOrderCount={itemsToOrder.length}
            isQuickPending={isQuickPending}
            isReadOnly={isReadOnly}
            onSubmit={handleQuickSubmit}
            onOpenPurchaseOrder={() => setShowPurchaseOrderModal(true)}
            onOpenAddItem={() => setShowAddModal(true)}
            onOpenHistory={handleOpenHistory}
            className="mb-8 sticky top-4 md:top-8 z-[50]"
          />

          <div className={cn(isReadOnly && 'pointer-events-none opacity-60')}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStartRows}
            onDragEnd={handleDragEndRows}
            modifiers={[restrictToWindowEdges]}
          >
            {/* Mobile Card Stack */}
            <div className="md:hidden w-full space-y-4 mb-8">
              {items.length === 0 ? (
                <div className="p-8 text-center text-base font-normal text-foreground/40 bg-card border border-border rounded-3xl">
                  ไม่มีข้อมูลสินค้าในระบบ กรุณากด "เพิ่มสินค้า" นะคะ
                </div>
              ) : (
                <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <MobileSortableRow
                        key={item.id}
                        item={item}
                        index={index}
                        totalItems={items.length}
                        columns={columns}
                        handleUpdateField={handleUpdateField}
                        handleSaveField={handleSaveField}
                        requestDelete={setDeleteId}
                        handleFocus={handleFocus}
                        getStockColorClass={getStockColorClass}
                      />
                    ))}
                  </div>
                </SortableContext>
              )}
            </div>

            {/* Desktop Card Grid (DnD) */}
            <div className="hidden md:block w-full pb-6">
              {items.length === 0 ? (
                <div className="p-8 text-center text-base font-normal text-foreground/40 bg-card border border-border rounded-3xl">
                  ไม่มีข้อมูลสินค้าในระบบ กรุณากด "เพิ่มสินค้า" นะคะ
                </div>
              ) : (
                <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {items.map((item, index) => (
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
                    ))}
                  </div>
                </SortableContext>
              )}
            </div>
          </DndContext>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4"
            onClick={() => { setShowAddModal(false); setNewItemInsertPosition(''); }}
          >
          <motion.div
            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative bg-card rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => { setShowAddModal(false); setNewItemInsertPosition(''); }} className="absolute top-4 right-4 p-2 text-foreground/40 hover:text-foreground hover:bg-black/5 rounded-full transition-colors z-10">
              <X className="w-5 h-5" />
            </button>
            <div className="px-6 h-14 border-b border-slate-100 flex items-center justify-between shrink-0 pr-14">
              <h2 className="text-lg font-normal text-foreground">เพิ่มรายการใหม่</h2>
            </div>
              <form onSubmit={handleAddItemSubmit} className="p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <label className="text-[12px] font-normal text-foreground ml-1 uppercase tracking-wider">ชื่อรายการ</label>
                    <input
                      required
                      value={newItemData.name || ''}
                      onChange={e => setNewItemData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-100 focus:border-black/20 focus:ring-1 focus:ring-black/10 rounded-3xl text-base md:text-sm font-normal text-foreground outline-none transition-all"
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
                      className="w-full h-11 px-4 bg-muted border border-border focus:border-foreground/20 rounded-3xl text-base md:text-sm font-normal text-foreground outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-normal text-slate-600 ml-1">หน่วย</label>
                    <input
                      value={newItemData.unit === null || newItemData.unit === undefined ? '' : newItemData.unit}
                      onChange={e => setNewItemData(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full h-11 px-4 bg-muted border border-border focus:border-foreground/20 rounded-3xl text-base md:text-sm font-normal text-foreground outline-none transition-all"
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
                      className="w-full h-11 px-4 bg-muted border border-border focus:border-foreground/20 rounded-3xl text-base md:text-sm font-normal text-foreground outline-none transition-all"
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
                      className="w-full h-11 px-4 bg-muted border border-border focus:border-foreground/20 rounded-3xl text-base md:text-sm font-normal text-foreground outline-none transition-all"
                    />
                  </div>

                  <div className="col-span-2 flex flex-col gap-1.5">
                    <label className="text-[12px] font-normal text-slate-600 ml-1">ช่องทางสั่งซื้อ</label>
                    <input
                      value={newItemData.source === null || newItemData.source === undefined ? '' : newItemData.source}
                      onChange={e => setNewItemData(prev => ({ ...prev, source: e.target.value }))}
                      className="w-full h-11 px-4 bg-muted border border-border focus:border-foreground/20 rounded-3xl text-base md:text-sm font-normal text-foreground outline-none transition-all"
                    />
                  </div>

                  <div className="col-span-2 flex flex-col gap-1.5">
                    <label className="text-[12px] font-normal text-slate-600 ml-1 flex items-center gap-1">
                      แทรกที่ลำดับ
                      <span className="text-foreground/30">(ค่าเริ่มต้น: ท้ายสุด = {items.length + 1})</span>
                    </label>
                    <input
                      data-testid="insert-position-input"
                      type="text"
                      inputMode="numeric"
                      placeholder={String(items.length + 1)}
                      value={newItemInsertPosition}
                      onChange={e => {
                        let v = e.target.value.replace(/[^0-9]/g, '');
                        v = v.replace(/^0+(?=\d)/, '');
                        setNewItemInsertPosition(v);
                      }}
                      className="w-full h-11 px-4 bg-muted border border-border focus:border-foreground/20 rounded-3xl text-base md:text-sm font-normal text-foreground outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="mt-8 flex gap-3">
                  <button type="button" onClick={() => { setShowAddModal(false); setNewItemInsertPosition(''); }} className="flex-1 py-3 px-4 bg-slate-50 hover:bg-slate-100 rounded-3xl text-[14px] font-normal text-foreground transition-colors">
                    ยกเลิก
                  </button>
                  <button type="submit" className="flex-1 py-3 px-4 bg-black hover:bg-black/90 rounded-3xl text-[14px] font-normal text-white transition-colors shadow-sm">
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
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="relative bg-card rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] w-full max-w-sm p-6 text-center">
              <button onClick={() => setDeleteId(null)} className="absolute top-4 right-4 p-2 text-foreground/40 hover:text-foreground hover:bg-black/5 rounded-full transition-colors z-10">
                <X className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 mt-2">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-normal text-foreground mb-2">ต้องการลบรายการนี้ใช่หรือไม่?</h3>
              <p className="text-sm font-normal text-foreground mb-6">ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนได้</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-3 px-4 bg-slate-50 hover:bg-slate-100 rounded-3xl text-[14px] font-normal text-foreground transition-colors">
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

      <AnimatePresence>
        {showHistoryModal && (
          <InventoryHistoryModal
            transactionHistory={transactionHistory}
            onClose={() => setShowHistoryModal(false)}
          />
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

      <ExportProgressOverlay
        visible={isExportingPO}
        title="กำลังบันทึกรูปภาพ"
        subtitle="กำลังจัดรายการสั่งซื้อ..."
      />

      {/* Hidden Export Purchase Orders Table */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <PurchaseOrdersModal
          isExportMode={true}
          selectedChannels={selectedChannels}
          setSelectedChannels={() => {}}
          itemsToOrder={itemsToOrder}
          poSources={poSources}
          displayedPoItems={displayedPoItems}
          getStockColorClass={getStockColorClass}
        />
      </div>
    </>
  );
}