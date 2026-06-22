'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Loader2, Undo2, Redo2, Trash2, X, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeOverlay, modalContent } from '@/lib/motion-presets';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  fetchTransactionHistory,
  fetchFrequentItems,
  deleteInventoryItem,
  deleteInventoryItemsBulk,
  updateInventoryStock,
  recordItemAddHistory,
  updateInventoryItemField,
  reorderInventoryItems,
  fetchInventoryTargetRecommendations,
} from '@/app/actions/inventory-actions';
import type { InventoryTransactionFilterType } from '@/app/actions/inventory-actions';
import { logClientDataChange } from '@/lib/client-data-change-log';
import { getClientSessionId } from '@/lib/client-session';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import { computePurchaseOrderDerivedState, formatInventoryNumericDisplay, getStockColorClass, mergeInventoryRealtimeUpdate } from '@/lib/inventory-stock';
import { formatTargetStockRecommendation, type InventoryShortageRisk } from '@/lib/inventory-recommended-target-stock';
import { INVENTORY_NOTIFICATION_SOURCES } from '@/lib/inventory-notification-filter';
import { useInventoryQuickAction } from '@/hooks/use-inventory-quick-action';
import { useInventoryRealtime } from '@/contexts/InventoryRealtimeContext';
import { InventoryQuickActionBar } from '@/components/inventory/InventoryQuickActionBar';
import type { TransactionHistoryRow } from '@/components/inventory/InventoryHistoryModal';
import {
  DndContext,
  closestCorners,
  DragEndEvent,
  DragStartEvent,
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
import { HintTooltip } from '@/components/ui/hint-tooltip';
import { SortableDragHandle } from '@/components/ui/sortable-drag-handle';
import {
  type InventoryItem,
  type ColumnDef,
  type NewItemFormData,
  type ColumnSettings,
  type InventoryCountPolicy,
  type InventoryFieldValue,
  type InventoryFieldSaveHandler,
  type InventoryCellBaseProps,
  type InventoryRowHandlers,
  defaultColumns,
  formatNumericFormValue,
  parseNumericFormValue,
  buildColumnsFromSettings,
  parseLocalColumnWidths,
  readInventoryField,
} from './types';

interface InventoryClientProps {
  initialItems: InventoryItem[];
  initialColumnSettings?: ColumnSettings;
  locale: string;
}

type ColumnLookup = Map<string, ColumnDef>;

const COUNT_POLICY_OPTIONS: Array<{ value: InventoryCountPolicy; label: string; description: string }> = [
  { value: 'exact_count', label: 'ต้องเบิก', description: 'คิดรวมใน Accuracy' },
  { value: 'sufficiency_check', label: 'ไม่ต้องเบิก', description: 'ไม่คิดรวมใน Accuracy' },
];

function normalizeCountPolicy(value: unknown): InventoryCountPolicy {
  return value === 'sufficiency_check' ? 'sufficiency_check' : 'exact_count';
}

function isManualOrderQty(item: InventoryItem): boolean {
  return false;
}

function normalizeShortageRisk(value: unknown): InventoryShortageRisk {
  return value === 'medium' || value === 'high' ? value : 'normal';
}

function getInventoryCellDisplayValue(item: InventoryItem, col: ColumnDef, manualOrderQty: boolean) {
  let val = readInventoryField(item, col.id);

  if (col.id === 'order_qty' && !manualOrderQty) {
    const stock = Number(item.stock) || 0;
    const orderPoint = Number(item.order_point) || 0;
    const targetStock = Number(item.target_stock) || 0;
    val = stock <= orderPoint ? Math.max(0, targetStock - stock) : 0;
  }

  if (col.id === 'target_stock') {
    return formatTargetStockRecommendation({
      currentTargetStock: Number(item.target_stock) || 0,
      recommendedTargetStock: Number(item.recommended_target_stock) || 0,
    });
  }

  if (col.type === 'number' || col.id === 'order_qty') {
    return formatInventoryNumericDisplay(val);
  }

  return val === null || val === undefined ? '' : String(val);
}

function CountPolicyToggle({
  item,
  handleUpdateField,
  handleSaveField,
  handleFocus,
}: {
  item: InventoryItem;
  handleUpdateField: (id: string, field: string, value: InventoryFieldValue) => void;
  handleSaveField: (id: string, field: string, value: InventoryFieldValue) => boolean | void | Promise<boolean | void>;
  handleFocus: () => void;
}) {
  const policy = normalizeCountPolicy(item.count_policy);
  const nextPolicy: InventoryCountPolicy = policy === 'exact_count' ? 'sufficiency_check' : 'exact_count';

  const savePolicy = () => {
    handleFocus();
    handleUpdateField(item.id, 'count_policy', nextPolicy);
    void handleSaveField(item.id, 'count_policy', nextPolicy);
  };

  return (
    <button
      type="button"
      aria-label="สลับวิธีตรวจนับ"
      onClick={savePolicy}
      className={cn(
        'bb-pastel-surface inline-flex h-8 shrink-0 items-center rounded-full border px-2.5 text-[12px] text-black shadow-sm transition-all hover:scale-[1.02] active:scale-95',
        policy === 'exact_count'
          ? 'border-[#bfdbfe] bg-[#dbeafe]'
          : 'border-[#f5c6cb] bg-[#f8d7da]',
      )}
    >
      <span className="mr-1.5 h-2 w-2 rounded-full bg-black/55" aria-hidden="true" />
      <span className="whitespace-nowrap">{policy === 'exact_count' ? 'ต้องเบิก' : 'ไม่ต้องเบิก'}</span>
    </button>
  );
}

function TargetStockRecommendationControl({
  item,
  handleUpdateField,
  handleSaveField,
  handleFocus,
}: {
  item: InventoryItem;
  handleUpdateField: (id: string, field: string, value: InventoryFieldValue) => void;
  handleSaveField: InventoryFieldSaveHandler;
  handleFocus: () => void;
}) {
  const [open, setOpen] = useState(false);
  const recommended = Number(item.recommended_target_stock ?? 0);
  const currentTarget = Number(item.target_stock ?? 0);
  const risk = normalizeShortageRisk(item.shortage_risk);
  const leadTimeDays = Number(item.lead_time_days ?? 3);
  const explanation = item.recommendation_explanation ?? [];

  const refreshRecommendation = async () => {
    const res = await fetchInventoryTargetRecommendations([item.id]);
    if (!res.success) {
      console.error('[TargetStockRecommendationControl] fetchInventoryTargetRecommendations:', res.error);
      return;
    }
    const recommendationsByItemId = res.recommendationsByItemId as Record<string, Partial<InventoryItem>>;
    const recommendation = recommendationsByItemId[item.id];
    if (!recommendation) return;
    handleUpdateField(item.id, 'recommended_target_stock', recommendation.recommended_target_stock ?? 0);
    handleUpdateField(item.id, 'recommendation_confidence', recommendation.recommendation_confidence ?? 'ข้อมูลน้อย');
    handleUpdateField(item.id, 'recommendation_explanation', recommendation.recommendation_explanation ?? []);
  };

  const saveField = (field: string, value: InventoryFieldValue) => {
    handleFocus();
    handleUpdateField(item.id, field, value);
    if (typeof value === 'string' || typeof value === 'number') {
      void Promise.resolve(handleSaveField(item.id, field, value)).then((saved) => {
        if (saved !== false && (field === 'shortage_risk' || field === 'lead_time_days')) {
          void refreshRecommendation();
        }
      });
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="ตั้งค่าจำนวนที่แนะนำ"
        title="ตั้งค่าจำนวนที่แนะนำ เช่น 20 → 28"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-card/85 px-1.5 py-0.5 text-[10px] text-foreground/45 shadow-sm ring-1 ring-border transition-colors hover:text-foreground"
      >
        ↗
      </button>
      {open && (
        <dialog
          open
          aria-label="รายละเอียดจำนวนที่แนะนำ"
          className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-sm rounded-3xl border border-border bg-card p-4 text-foreground shadow-2xl md:inset-auto md:right-6 md:top-24 md:bottom-auto"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">จำนวนที่ต้องมี</p>
              <p className="text-xs text-muted-foreground">เดิม {currentTarget} · แนะนำ {recommended || '-'}</p>
            </div>
            <button
              type="button"
              aria-label="ปิดรายละเอียดจำนวนที่แนะนำ"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">ความเสี่ยง</span>
              <select
                value={risk}
                onChange={(event) => saveField('shortage_risk', event.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-foreground/10"
              >
                <option value="normal">ปกติ</option>
                <option value="medium">ปานกลาง</option>
                <option value="high">สูง</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">lead time (วัน)</span>
              <input
                type="number"
                min={0}
                max={30}
                value={leadTimeDays}
                onChange={(event) => saveField('lead_time_days', Number(event.target.value))}
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-foreground/10"
              />
            </label>

            <div className="rounded-2xl bg-muted p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">ดูเหตุผล</p>
              {explanation.length > 0 ? (
                explanation.map((line) => <p key={line}>{line}</p>)
              ) : (
                <p>ยังไม่มีข้อมูลเพียงพอสำหรับคำแนะนำ</p>
              )}
              {item.recommendation_confidence && (
                <p className="mt-2 text-foreground/70">ความมั่นใจ: {item.recommendation_confidence}</p>
              )}
            </div>

            <button
              type="button"
              disabled={!recommended || recommended <= currentTarget}
              onClick={() => {
                saveField('target_stock', recommended);
                setOpen(false);
              }}
              className="w-full rounded-2xl bg-foreground px-4 py-2 text-sm text-background disabled:cursor-not-allowed disabled:opacity-40"
            >
              ใช้ค่าที่แนะนำ
            </button>
          </div>
        </dialog>
      )}
    </>
  );
}

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
  handleSaveField: InventoryFieldSaveHandler;
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
        className="w-8 h-5 text-[12px] tabular-nums text-center bg-muted border border-border rounded focus:outline-none focus:ring-1 focus:ring-foreground/20 shrink-0"
        style={{ width: '2rem' }}
      />
    );
  }

  return (
    <HintTooltip tip={`แตะเพื่อเปลี่ยนลำดับ (1–${totalItems})`}>
      <button
        data-testid="sort-order-input"
        type="button"
        onClick={() => { setLocalVal(String(displayIndex)); setEditing(true); }}
        className="text-[12px] font-normal text-foreground/35 tabular-nums shrink-0 hover:text-foreground/60 hover:bg-muted rounded px-1 transition-colors leading-none cursor-pointer"
      >
        {displayIndex.toString().padStart(2, '0')}
      </button>
    </HintTooltip>
  );
}

const SortableRow = React.memo(({ item, index: rowIndex, columnById, handleUpdateField, handleSaveField, requestDelete, handleFocus, totalItems }: {
  item: InventoryItem;
  index: number;
  columnById: ColumnLookup;
  handleUpdateField: (id: string, field: string, value: InventoryFieldValue) => void;
  handleSaveField: InventoryFieldSaveHandler;
  requestDelete: (id: string) => void;
  handleFocus: () => void;
  totalItems: number;
}) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition: dndTransition, isDragging } = useSortable({ id: item.id });

  const stock = Number(item.stock) || 0;
  const orderPoint = Number(item.order_point) || 0;
  const targetStock = Number(item.target_stock) || 0;
  const manualOrderQty = isManualOrderQty(item);

  const nameCol = columnById.get('name')!;
  const stockCol = columnById.get('stock')!;
  const orderQtyCol = columnById.get('order_qty');
  const orderPointCol = columnById.get('order_point')!;
  const targetStockCol = columnById.get('target_stock')!;
  const unitCol = columnById.get('unit')!;
  const sourceCol = columnById.get('source')!;

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
        "bb-inventory-row-containment bg-card border border-border rounded-2xl p-3.5 shadow-sm space-y-2.5 flex flex-col transition-all duration-200",
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
            col={nameCol}
            rowIndex={rowIndex}
            handleUpdateField={handleUpdateField}
            handleSaveField={handleSaveField}
            requestDelete={requestDelete}
            handleFocus={handleFocus}
            cardMode
            showDeleteButton={false}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <CountPolicyToggle
            item={item}
            handleUpdateField={handleUpdateField}
            handleSaveField={handleSaveField}
            handleFocus={handleFocus}
          />
          <HintTooltip tip="ลบรายการ">
            <button
              type="button"
              onClick={() => requestDelete(item.id)}
              aria-label="ลบรายการ"
              className="p-1.5 text-foreground/20 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </HintTooltip>
          <SortableDragHandle
            attributes={attributes}
            listeners={listeners}
            setActivatorNodeRef={setActivatorNodeRef}
          />
        </div>
      </div>

      {/* Card Body: Stats Grid */}
      <div className="grid grid-cols-6 gap-1 pt-0.5">
        {/* Stock */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[9px] text-foreground/45 font-normal uppercase tracking-tight text-center truncate">
            {stockCol?.label || 'คงเหลือ'}
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
            {orderQtyCol?.label || 'สั่งซื้อ'}
          </span>
          {orderQtyCol && (
            <EditableCell
              item={item}
              col={orderQtyCol}
              rowIndex={rowIndex}
              handleUpdateField={handleUpdateField}
              handleSaveField={handleSaveField}
              requestDelete={requestDelete}
              handleFocus={handleFocus}
              cardMode
              className={manualOrderQty ? 'bb-pastel-surface border-[#f5c6cb] bg-[#f8d7da] text-black' : undefined}
            />
          )}
        </div>

        {/* Order Point */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[9px] text-foreground/45 font-normal uppercase tracking-tight text-center truncate">
            {orderPointCol?.label || 'จุดสั่ง'}
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
            {targetStockCol?.label || 'ต้องมี'}
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
            {unitCol?.label || 'หน่วย'}
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
            {sourceCol?.label || 'ช่องทาง'}
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

const MobileSortableRow = React.memo(({
  item,
  index,
  totalItems,
  columnById,
  handleUpdateField,
  handleSaveField,
  requestDelete,
  handleFocus,
  getStockColorClass,
}: Pick<InventoryCellBaseProps, 'handleUpdateField' | 'handleSaveField' | 'handleFocus' | 'requestDelete'> & {
  item: InventoryItem;
  index: number;
  totalItems: number;
  columnById: ColumnLookup;
  getStockColorClass: (stock: number, orderPoint: number) => string;
}) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: transition || 'transform 150ms cubic-bezier(0.2, 0, 0, 1)',
    zIndex: isDragging ? 100 : 1,
    willChange: 'transform',
  };

  const stock = Number(item.stock) || 0;
  const orderPoint = Number(item.order_point) || 0;
  const stockCol = columnById.get('stock')!;
  const orderQtyCol = columnById.get('order_qty');
  const orderPointCol = columnById.get('order_point')!;
  const targetStockCol = columnById.get('target_stock')!;
  const manualOrderQty = isManualOrderQty(item);

  return (
    <div
      ref={setNodeRef}
      data-inventory-item-id={item.id}
      style={style}
      className={cn(
        "bb-inventory-row-containment w-full min-w-0 bg-card border border-border rounded-2xl p-3.5 shadow-sm space-y-2.5 flex flex-col transition-all duration-200",
        isDragging && "opacity-80 scale-[1.02] shadow-2xl ring-2 ring-foreground/10 cursor-grabbing"
      )}
    >
      {/* Card Header: Item Index, Item Name (Editable), Grip Handle, Delete Button */}
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <SortableDragHandle
            attributes={attributes}
            listeners={listeners}
            setActivatorNodeRef={setActivatorNodeRef}
            className="text-foreground/20 hover:text-foreground/50"
          />
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
        <div className="flex shrink-0 items-center gap-1.5">
          <CountPolicyToggle
            item={item}
            handleUpdateField={handleUpdateField}
            handleSaveField={handleSaveField}
            handleFocus={handleFocus}
          />
          <HintTooltip tip="ลบรายการ">
            <button
              type="button"
              onClick={() => requestDelete(item.id)}
              aria-label="ลบรายการ"
              className="p-1.5 text-foreground/20 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </HintTooltip>
        </div>
      </div>

      {/* Card Body: Single Row Grid */}
      <div className="grid grid-cols-6 gap-1 pt-1 min-w-0 overflow-hidden">
        {/* Stock */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[9px] text-foreground/45 font-normal uppercase tracking-tight text-center truncate">คงเหลือ</span>
          <MobileEditableCell
            item={item}
            col={stockCol}
            rowIndex={index}
            handleUpdateField={handleUpdateField}
            handleSaveField={handleSaveField}
            handleFocus={handleFocus}
            className={cn(
              "w-full h-8 px-1 rounded-lg border border-border bg-muted text-[13px] font-normal text-center focus:bg-card focus:outline-none focus:ring-1 focus:ring-foreground/10 transition-all tabular-nums truncate",
              getStockColorClass(stock, orderPoint)
            )}
          />
        </div>

        {/* Order Qty (Computed / Read-only) */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[9px] text-foreground/45 font-normal uppercase tracking-tight text-center truncate">สั่งซื้อ</span>
          {orderQtyCol && (
            <MobileEditableCell
              item={item}
              col={orderQtyCol}
              rowIndex={index}
              handleUpdateField={handleUpdateField}
              handleSaveField={handleSaveField}
              handleFocus={handleFocus}
              className={cn(
                "w-full h-8 px-1 rounded-lg border text-[13px] font-normal text-center focus:outline-none focus:ring-1 transition-all tabular-nums truncate",
                manualOrderQty
                  ? 'bb-pastel-surface border-[#f5c6cb] bg-[#f8d7da] text-black focus:bg-[#f8d7da]'
                  : 'border-border bg-muted text-muted-foreground focus:bg-card focus:ring-foreground/10 cursor-not-allowed'
              )}
            />
          )}
        </div>

        {/* Order Point */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[9px] text-foreground/45 font-normal uppercase tracking-tight text-center truncate">จุดสั่ง</span>
          <MobileEditableCell
            item={item}
            col={orderPointCol}
            rowIndex={index}
            handleUpdateField={handleUpdateField}
            handleSaveField={handleSaveField}
            handleFocus={handleFocus}
            className="w-full h-8 px-1 rounded-lg border border-border bg-muted text-[13px] font-normal text-center focus:bg-card focus:outline-none focus:ring-1 focus:ring-foreground/10 transition-all tabular-nums truncate"
          />
        </div>

        {/* Target Stock */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[9px] text-foreground/45 font-normal uppercase tracking-tight text-center truncate">ต้องมี</span>
          <MobileEditableCell
            item={item}
            col={targetStockCol}
            rowIndex={index}
            handleUpdateField={handleUpdateField}
            handleSaveField={handleSaveField}
            handleFocus={handleFocus}
            className="w-full h-8 px-1 rounded-lg border border-border bg-muted text-[13px] font-normal text-center focus:bg-card focus:outline-none focus:ring-1 focus:ring-foreground/10 transition-all tabular-nums truncate"
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
const InventoryHistoryModal = dynamic(
  () => import('@/components/inventory/InventoryHistoryModal').then((mod) => mod.InventoryHistoryModal),
  { ssr: false },
);

const preloadPurchaseOrdersModal = () => {
  void import('./PurchaseOrdersModal');
};

const preloadInventoryHistoryModal = () => {
  void import('@/components/inventory/InventoryHistoryModal');
};

const HISTORY_PAGE_SIZE = 50;

function EditableCell({
  item,
  col,
  rowIndex,
  handleUpdateField,
  handleSaveField,
  requestDelete,
  handleFocus,
  cardMode,
  showDeleteButton = true,
  className,
}: InventoryCellBaseProps & { cardMode?: boolean; showDeleteButton?: boolean; className?: string }) {
  const manualOrderQty = isManualOrderQty(item);
  const [localValue, setLocalValue] = useState<string>(() => getInventoryCellDisplayValue(item, col, manualOrderQty));
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with global state when not focused
  useEffect(() => {
    if (!isFocused) {
      const displayVal = getInventoryCellDisplayValue(item, col, manualOrderQty);
      if (inputRef.current && inputRef.current.value !== displayVal) {
        inputRef.current.value = displayVal;
      }
    }
  }, [item, col, item.stock, item.order_point, item.target_stock, item.recommended_target_stock, item.count_policy, item.order_qty, isFocused, manualOrderQty]);

  const handleInputFocus = () => {
    setIsFocused(true);
    handleFocus();
    if (col.id === 'target_stock' && inputRef.current) {
      inputRef.current.value = formatInventoryNumericDisplay(item.target_stock);
      inputRef.current.select();
    }
  };

  const handleBlur = () => {
    const val = inputRef.current?.value || '';
    let finalVal: string | number = val;

    if (col.type === 'number') {
      const numericValue = val === "" ? 0 : Number(val);
      finalVal = isNaN(numericValue) ? 0 : numericValue;
    }

    setLocalValue(
      col.type === 'number' || col.id === 'order_qty'
        ? formatInventoryNumericDisplay(finalVal)
        : String(finalVal)
    );
    setIsFocused(false);

    // PERSISTENCE ARMOR: Push updates to Supabase via parent handlers
    handleUpdateField(item.id, col.id, finalVal);
    handleSaveField(item.id, col.id, finalVal);
  };

  // ควบคุมการจัดเรียงข้อความและสีเฉพาะคอลัมน์คงเหลือ
  const getAlignmentAndColor = () => {
    if (col.id === 'name') return 'text-left pr-10 text-foreground';
    if (col.id === 'stock') return `text-center ${getStockColorClass(Number(item.stock) || 0, Number(item.order_point) || 0)}`;
    if (col.id === 'order_qty') return manualOrderQty ? 'text-center text-black' : 'text-center text-foreground';
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
            onFocus={handleInputFocus}
            onBlur={handleBlur}
            data-col-id={col.id}
            data-row-index={rowIndex}
            className="flex-1 min-w-0 bg-transparent border-none text-base text-foreground font-normal focus:bg-muted focus:outline-none rounded px-1.5 py-0.5 truncate"
            placeholder="ชื่อสินค้า"
          />
          {showDeleteButton && (
            <HintTooltip tip="ลบรายการ">
              <button
                onClick={() => requestDelete(item.id)}
                aria-label="ลบรายการ"
                className="ml-1 p-1 text-foreground/20 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </HintTooltip>
          )}
        </div>
      );
    }
    const input = (
      <input
        ref={inputRef}
        type="text"
        inputMode={col.type === 'number' ? 'decimal' : 'text'}
        defaultValue={localValue}
        onFocus={handleInputFocus}
        onBlur={handleBlur}
        data-col-id={col.id}
        data-row-index={rowIndex}
        readOnly={col.id === 'order_qty' && !manualOrderQty}
        className={cn(
          "w-full h-8 px-1 rounded-lg border border-border bg-muted text-[13px] font-normal text-center focus:bg-card focus:outline-none focus:ring-1 focus:ring-foreground/10 transition-all tabular-nums truncate",
          col.id === 'stock' && getStockColorClass(Number(item.stock) || 0, Number(item.order_point) || 0),
          col.id === 'order_qty' && !manualOrderQty && 'bg-muted border-border text-muted-foreground cursor-not-allowed',
          col.id === 'target_stock' && 'pr-6',
          className,
        )}
      />
    );

    if (col.id === 'target_stock') {
      return (
        <div className="relative">
          {input}
          <TargetStockRecommendationControl
            item={item}
            handleUpdateField={handleUpdateField}
            handleSaveField={handleSaveField}
            handleFocus={handleFocus}
          />
        </div>
      );
    }

    return input;
  }

  return (
    <div className="flex items-center relative h-full">
      <input
        ref={inputRef}
        type="text"
        inputMode={col.type === 'number' ? 'decimal' : 'text'}
        defaultValue={localValue}
        onFocus={() => {
          handleInputFocus();
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
        readOnly={col.id === 'order_qty' && !manualOrderQty}
        className={cn(
          `w-full px-4 py-4 pt-5 pb-3 min-h-[56px] bg-transparent border-none focus:outline-none focus:bg-muted/80 text-base md:text-sm font-normal leading-[1.6] transition-all ${getAlignmentAndColor()} ${col.type === 'number' ? 'tabular-nums' : ''}`,
          col.id === 'order_qty' && !manualOrderQty && 'bg-muted cursor-not-allowed select-none',
          col.id === 'order_qty' && manualOrderQty && 'bb-pastel-surface bg-[#f8d7da] text-black',
        )}
      />
      {col.id === 'target_stock' && (
        <TargetStockRecommendationControl
          item={item}
          handleUpdateField={handleUpdateField}
          handleSaveField={handleSaveField}
          handleFocus={handleFocus}
        />
      )}
      {col.id === 'name' && (
        <HintTooltip tip="ลบรายการ">
          <button
            onClick={() => requestDelete(item.id)}
            aria-label="ลบรายการ"
            className="absolute right-3 p-1.5 text-foreground/20 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover/cell:opacity-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </HintTooltip>
      )}
    </div>
  );
}

function MobileEditableCell({ item, col, rowIndex, handleUpdateField, handleSaveField, handleFocus, className }: Pick<InventoryCellBaseProps, 'item' | 'col' | 'rowIndex' | 'handleUpdateField' | 'handleSaveField' | 'handleFocus'> & { className?: string }) {
  const manualOrderQty = isManualOrderQty(item);
  const [localValue, setLocalValue] = useState<string>(() => getInventoryCellDisplayValue(item, col, manualOrderQty));
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      const displayVal = getInventoryCellDisplayValue(item, col, manualOrderQty);
      if (inputRef.current && inputRef.current.value !== displayVal) {
        inputRef.current.value = displayVal;
      }
    }
  }, [item, col, item.stock, item.order_point, item.target_stock, item.recommended_target_stock, item.count_policy, item.order_qty, isFocused, manualOrderQty]);

  const handleInputFocus = () => {
    setIsFocused(true);
    handleFocus();
    if (col.id === 'target_stock' && inputRef.current) {
      inputRef.current.value = formatInventoryNumericDisplay(item.target_stock);
      inputRef.current.select();
    }
  };

  const handleBlur = () => {
    const val = inputRef.current?.value || '';
    let finalVal: string | number = val;

    if (col.type === 'number') {
      const numericValue = val === "" ? 0 : Number(val);
      finalVal = isNaN(numericValue) ? 0 : numericValue;
    }

    setLocalValue(
      col.type === 'number' || col.id === 'order_qty'
        ? formatInventoryNumericDisplay(finalVal)
        : String(finalVal)
    );
    setIsFocused(false);

    handleUpdateField(item.id, col.id, finalVal);
    handleSaveField(item.id, col.id, finalVal);
  };

  const input = (
    <input
      ref={inputRef}
      type="text"
      inputMode={col.type === 'number' ? 'decimal' : 'text'}
      defaultValue={localValue}
      onFocus={handleInputFocus}
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
      readOnly={col.id === 'order_qty' && !manualOrderQty}
      className={cn(className, col.id === 'target_stock' && 'pr-6')}
    />
  );

  if (col.id === 'target_stock') {
    return (
      <div className="relative">
        {input}
        <TargetStockRecommendationControl
          item={item}
          handleUpdateField={handleUpdateField}
          handleSaveField={handleSaveField}
          handleFocus={handleFocus}
        />
      </div>
    );
  }

  return input;
}

export default function InventoryClient({
  initialItems,
  initialColumnSettings = null,
  locale: _locale,
}: InventoryClientProps) {
  const router = useRouter();
  const isReadOnly = useReadOnly();
  const { subscribe, refresh } = useInventoryRealtime();

  const blockIfReadOnly = useCallback(() => {
    if (isReadOnly) {
      alert(READ_ONLY_DENY_MSG);
      return true;
    }
    return false;
  }, [isReadOnly]);
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [columns, setColumns] = useState<ColumnDef[]>(() =>
    buildColumnsFromSettings(initialColumnSettings ?? undefined, parseLocalColumnWidths())
  );
  const columnById = useMemo(() => new Map(columns.map((column) => [column.id, column])), [columns]);
  const sortableItemIds = useMemo(() => items.map((item) => item.id), [items]);
  const [loading, setLoading] = useState(false);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'synced'>('idle');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDesktopLayout, setIsDesktopLayout] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPurchaseOrderModal, setShowPurchaseOrderModal] = useState(false);
  const [isExportingPO, setIsExportingPO] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['all']);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  // Add Form State
  const [newItemData, setNewItemData] = useState<NewItemFormData>({});
  const [newItemInsertPosition, setNewItemInsertPosition] = useState<string>('');

  // History State
  const [undoStack, setUndoStack] = useState<{ items: InventoryItem[], cols: ColumnDef[] }[]>([]);
  const [redoStack, setRedoStack] = useState<{ items: InventoryItem[], cols: ColumnDef[] }[]>([]);
  const previousStateRef = useRef<{ items: InventoryItem[], cols: ColumnDef[] }>({ items: initialItems, cols: columns });
  const recommendationLoadKeyRef = useRef('');

  const sensors = useSafeDndSensors();

  // Quick Entry State
  const [isQuickActionBarOpen, setIsQuickActionBarOpen] = useState(true);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [frequentItems, setFrequentItems] = useState<{ id: string, name: string }[]>([]);
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistoryRow[]>([]);
  const [historyTypeFilter, setHistoryTypeFilter] = useState<InventoryTransactionFilterType>('ALL');
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const loadHistoryPage = useCallback(
    async ({
      type = historyTypeFilter,
      offset = 0,
      append = false,
    }: {
      type?: InventoryTransactionFilterType;
      offset?: number;
      append?: boolean;
    } = {}) => {
      setIsHistoryLoading(true);
      try {
        const res = await fetchTransactionHistory({
          type,
          offset,
          limit: HISTORY_PAGE_SIZE,
        });
        if (res.success && res.data) {
          setTransactionHistory((prev) => (append ? [...prev, ...res.data] : res.data));
          setHasMoreHistory(Boolean(res.hasMore));
        } else if (res.error) {
          console.error('[UI] History fetch failed:', res.error);
          setHasMoreHistory(false);
        }
      } finally {
        setIsHistoryLoading(false);
      }
    },
    [historyTypeFilter],
  );

  const quickAction = useInventoryQuickAction({
    items,
    setItems,
    isReadOnly,
    showHistoryModal,
    onHistoryRefresh: () => loadHistoryPage({ offset: 0 }),
    notificationSource: INVENTORY_NOTIFICATION_SOURCES.QUICK_ACTION_BAR,
    onBeforeSave: () => setSavingState('saving'),
    onAfterSave: () => {
      setIsQuickActionBarOpen(false);
      setSavingState('synced');
      setTimeout(() => setSavingState('idle'), 2000);
      void fetchFrequentItems().then((res) => {
        if (res.success && res.data) setFrequentItems(res.data);
      });
    },
    onSaveError: () => setSavingState('idle'),
  });

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const updateLayout = () => setIsDesktopLayout(media.matches);
    updateLayout();
    media.addEventListener('change', updateLayout);
    return () => media.removeEventListener('change', updateLayout);
  }, []);

  const { itemsToOrder, poSources, displayedPoItems } = useMemo(
    () => computePurchaseOrderDerivedState(items, selectedChannels),
    [items, selectedChannels],
  );

  const exportPOImage = async () => {
    const element = document.getElementById('blackandbrew-po-table-export');
    if (!element) return;
    try {
      setIsExportingPO(true);
      const { captureElementAsPng, downloadDataUrl } = await import('@/lib/capture-element-png');
      const dataUrl = await captureElementAsPng(element, {
        backgroundColor: '#fff3dd',
        preserveOverflow: true,
        filter: (node: HTMLElement) => node?.id !== 'po-action-buttons',
      });
      const channelSuffix = selectedChannels.includes('all')
        ? 'All'
        : selectedChannels.join('-');
      downloadDataUrl(
        dataUrl,
        `PurchaseOrders-${channelSuffix}-${new Date().toISOString().split('T')[0]}.png`,
      );
    } catch (err) {
      console.error('Failed to export PO image:', err);
    } finally {
      setIsExportingPO(false);
    }
  };

  useEffect(() => {
    loadFrequentItems();
  }, []);

  useEffect(() => {
    // Debounce realtime events to coalesce rapid-fire updates
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pendingPayloads: any[] = [];

    const unsubscribe = subscribe((payload) => {
      pendingPayloads.push(payload);
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const payloads = pendingPayloads;
        pendingPayloads = [];
        setItems((prev) => {
          let next = prev;
          for (const p of payloads) {
            if (p.eventType === 'INSERT') {
              if (!next.find((i) => i.id === p.new.id)) {
                next = [...next, p.new as InventoryItem];
              }
            } else if (p.eventType === 'UPDATE') {
              next = next.map((item) =>
                item.id === p.new.id
                  ? mergeInventoryRealtimeUpdate(item, p.new as InventoryItem)
                  : item,
              );
            } else if (p.eventType === 'DELETE') {
              next = next.filter((item) => item.id !== p.old.id);
            }
          }
          return next;
        });
      }, 100);
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [subscribe]);

  useEffect(() => {
    const itemIds = items.map((item) => item.id).filter(Boolean);
    const loadKey = itemIds.join('|');
    if (!loadKey || recommendationLoadKeyRef.current === loadKey) return;
    recommendationLoadKeyRef.current = loadKey;

    void fetchInventoryTargetRecommendations(itemIds).then((res) => {
      if (!res.success) {
        console.error('[InventoryClient] fetchInventoryTargetRecommendations:', res.error);
        return;
      }

      const recommendationsByItemId = res.recommendationsByItemId as Record<string, Partial<InventoryItem>>;
      setItems((prev) =>
        prev.map((item) => {
          const recommendation = recommendationsByItemId[item.id];
          return recommendation ? { ...item, ...recommendation } : item;
        }),
      );
    });
  }, [items]);

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

  const fetchConfigAndInventory = useCallback(async () => {
    try {
      await ensureSupabaseSession();
      const [configRes, loadedItems] = await Promise.all([
        supabase.from('inventory_config').select('settings').eq('id', 'column_labels').single(),
        refresh(),
      ]);

      const sanitizedLoadedItems = loadedItems.map((item) => sanitizeInventoryItem(item as InventoryItem));
      setItems(sanitizedLoadedItems);

      const localWidths = parseLocalColumnWidths();
      const loadedCols = buildColumnsFromSettings(
        configRes.data?.settings as ColumnSettings | undefined,
        localWidths,
      );
      if (configRes.data?.settings?.order && configRes.data.settings.labels) {
        setColumns(loadedCols);
      }

      previousStateRef.current = { items: sanitizedLoadedItems, cols: loadedCols };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to fetch inventory:', message);
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const handleOpenPurchaseOrders = useCallback(() => {
    preloadPurchaseOrdersModal();
    setShowPurchaseOrderModal(true);
    // Refresh from DB when PO modal opens so stock matches other windows.
    void fetchConfigAndInventory();
  }, [fetchConfigAndInventory]);

  function sanitizeInventoryItem(item: InventoryItem) {
    const sanitized = { ...item };
    const numericFields = ['stock', 'order_qty', 'order_point', 'target_stock', 'sort_order', 'lead_time_days'];

    numericFields.forEach((field) => {
      const key = field as keyof InventoryItem;
      const val = sanitized[key];
      if (val === '' || val === null || val === undefined || (typeof val !== 'number' && isNaN(Number(val)))) {
        (sanitized as Record<string, number | string>)[key] = 0;
      } else {
        (sanitized as Record<string, number | string>)[key] = Number(val);
      }
    });

    // คง updated_at เดิมไว้ ไม่ลบทิ้ง เพื่อไม่ให้ Supabase reset เป็น NOW() (UTC)
    sanitized.count_policy = normalizeCountPolicy(sanitized.count_policy);
    sanitized.shortage_risk = normalizeShortageRisk(sanitized.shortage_risk);
    if (sanitized.lead_time_days === undefined) {
      sanitized.lead_time_days = 3;
    }
    if (!sanitized.updated_at) {
      sanitized.updated_at = new Date().toISOString();
    }
    return sanitized;
  }

  const pushHistory = useCallback(() => {
    setUndoStack(prev => [...prev, previousStateRef.current]);
    setRedoStack([]);
  }, []);

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
      stock: parseNumericFormValue(newItemData.stock),
      order_qty: parseNumericFormValue(newItemData.order_qty),
      order_point: parseNumericFormValue(newItemData.order_point),
      target_stock: parseNumericFormValue(newItemData.target_stock),
      unit: newItemData.unit || '',
      source: newItemData.source || '',
      count_policy: normalizeCountPolicy(newItemData.count_policy),
      shortage_risk: normalizeShortageRisk(newItemData.shortage_risk),
      lead_time_days: Number(newItemData.lead_time_days ?? 3),
      sort_order: insertPos
    };

    const tempId = crypto.randomUUID();

    // Optimistic update: pre-compute renumbered array so we have it for DB sync
    let renumberedItems: InventoryItem[];
    if (isAppend) {
      renumberedItems = [...items, { ...newItem, id: tempId } as InventoryItem];
    } else {
      const sorted = [...items].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      sorted.splice(insertPos - 1, 0, { ...newItem, id: tempId } as InventoryItem);
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
        const historyRes = await recordItemAddHistory(data.id, Number(data.stock ?? 0), data.name);
        if (!historyRes.success) {
          console.error('[handleAddItemSubmit] recordItemAddHistory:', historyRes.error);
        } else if (showHistoryModal) {
          await loadHistoryPage({ offset: 0 });
        }
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
        const historyRes = await recordItemAddHistory(data.id, Number(data.stock ?? 0), data.name);
        if (!historyRes.success) {
          console.error('[handleAddItemSubmit] recordItemAddHistory:', historyRes.error);
        } else if (showHistoryModal) {
          await loadHistoryPage({ offset: 0 });
        }
      }

      setSavingState('synced');
      setTimeout(() => setSavingState('idle'), 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to add item:', message);
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

      if (showHistoryModal) {
        await loadHistoryPage({ offset: 0 });
      }

      setSavingState('synced');
      setTimeout(() => setSavingState('idle'), 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Supabase Error (Delete):', message);
      fetchConfigAndInventory();
    }
  }

  const handleFocus = useCallback(() => {
    setIsEditing(prev => prev ? prev : true);
  }, []);

  const handleUpdateField = useCallback((id: string, field: string, value: InventoryFieldValue) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  }, []);

  const handleSaveField = useCallback(async (id: string, field: string, value: InventoryFieldValue) => {
    if (blockIfReadOnly()) return false;
    if (Array.isArray(value)) return false;
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
        return false;
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
        const result = await reorderInventoryItems(
          renumberedItems.map(item => ({ id: item.id, sort_order: item.sort_order })),
          {
            clientSessionId: getClientSessionId(),
          },
        );
        if (!result.success) {
          throw new Error(result.error);
        }
        setSavingState('synced');
        setTimeout(() => setSavingState('idle'), 2000);
        return true;
      } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
        console.error('Failed to update sort_order:', message);
        setSavingState('idle');
        fetchConfigAndInventory(); // rollback on error
        return false;
      }
    }

    // Normal handling for other fields
    let sanitizedValue = value;
    const numericFields = ['stock', 'order_qty', 'order_point', 'target_stock', 'lead_time_days'];
    if (numericFields.includes(field)) {
      sanitizedValue = value === '' || value === null || value === undefined ? 0 : Number(value);
      if (isNaN(sanitizedValue as number)) sanitizedValue = 0;
    }
    if (field === 'count_policy') {
      sanitizedValue = normalizeCountPolicy(value);
    }

    // Prevent redundant saves: compare with original value to avoid unnecessary updated_at changes
    if (original) {
      if (numericFields.includes(field)) {
        if (Number(original[field]) === Number(sanitizedValue)) return true;
      } else {
        if (String(original[field] || '') === String(sanitizedValue || '')) return true;
      }
    }

    pushHistory();
    setSavingState('saving');

    try {
      if (field === 'stock') {
        const result = await updateInventoryStock(id, sanitizedValue as number, 'Warehouse edit', {
          clientSessionId: getClientSessionId(),
          notificationSource: INVENTORY_NOTIFICATION_SOURCES.WAREHOUSE_GRID,
        });
        if (!result.success) throw new Error(result.error);
        handleUpdateField(id, 'stock', result.newStock ?? sanitizedValue);
      } else {
        const result = await updateInventoryItemField(id, field, sanitizedValue, {
          clientSessionId: getClientSessionId(),
        });
        if (!result.success) throw new Error(result.error);
      }
      setSavingState('synced');
      setTimeout(() => setSavingState('idle'), 2000);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Failed to update ${field}:`, message);
      setSavingState('idle');
      fetchConfigAndInventory();
      return false;
    }
  }, [
    blockIfReadOnly,
    fetchConfigAndInventory,
    handleUpdateField,
    items,
    pushHistory,
  ]);

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to save columns config:', message);
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

  async function handleDragStartRows(event: DragStartEvent) {
    setActiveRowId(String(event.active.id));
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
      const result = await reorderInventoryItems(
        updatedItems.map(item => ({ id: item.id, sort_order: item.sort_order })),
        {
          clientSessionId: getClientSessionId(),
        },
      );
      if (!result.success) {
        throw new Error(result.error);
      }
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
            count_policy: normalizeCountPolicy(item.count_policy),
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error syncing undo/redo:', message);
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
    setHistoryTypeFilter('ALL');
    setHasMoreHistory(false);
    setShowHistoryModal(true);
    await loadHistoryPage({ type: 'ALL', offset: 0 });
  }

  function handleHistoryTypeFilterChange(nextType: InventoryTransactionFilterType) {
    setHistoryTypeFilter(nextType);
    setTransactionHistory([]);
    setHasMoreHistory(false);
    void loadHistoryPage({ type: nextType, offset: 0 });
  }

  function handleLoadMoreHistory() {
    if (isHistoryLoading || !hasMoreHistory) return;
    void loadHistoryPage({ offset: transactionHistory.length, append: true });
  }

  async function handleCancelTransaction(txId: string, itemId: string, type: 'IN' | 'OUT', quantity: number) {
    if (blockIfReadOnly()) return;
    void itemId;
    void type;
    void quantity;
    if (!window.confirm('ลบเฉพาะประวัติรายการนี้ใช่หรือไม่? ยอดคงเหลือปัจจุบันจะไม่ถูกเปลี่ยน')) return;

    setSavingState('saving');
    try {
      const { error: deleteError } = await supabase
        .from('inventory_transactions')
        .delete()
        .eq('id', txId);

      if (deleteError) throw deleteError;

      // Refresh history
      await loadHistoryPage({ offset: 0 });

      setSavingState('synced');
      setTimeout(() => setSavingState('idle'), 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to cancel transaction:', message);
      alert('ไม่สามารถยกเลิกรายการได้: ' + message);
      setSavingState('idle');
    }
  }

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
      <div className="flex-1 w-full max-w-full bg-transparent text-foreground font-normal antialiased transition-all duration-300 flex flex-col items-center md:items-start p-4 md:p-8 overflow-x-hidden">
        <div className="w-full max-w-7xl mx-auto flex flex-col items-stretch md:items-stretch">
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
                <HintTooltip tip="ย้อนกลับ">
                  <button
                    onClick={handleUndo}
                    disabled={isReadOnly || undoStack.length === 0 || isSyncing}
                    className={`p-2.5 rounded-3xl transition-all ${undoStack.length === 0 || isSyncing
                      ? 'text-[#94a3b8] cursor-default'
                      : 'text-foreground hover:bg-black/5'
                      }`}
                    aria-label="ย้อนกลับ"
                  >
                    <Undo2 className="w-4 h-4" />
                  </button>
                </HintTooltip>
                <HintTooltip tip="ทำซ้ำ">
                  <button
                    onClick={handleRedo}
                    disabled={isReadOnly || redoStack.length === 0 || isSyncing}
                    className={`p-2.5 rounded-3xl transition-all ${redoStack.length === 0 || isSyncing
                      ? 'text-[#94a3b8] cursor-default'
                      : 'text-foreground hover:bg-black/5'
                      }`}
                    aria-label="ทำซ้ำ"
                  >
                    <Redo2 className="w-4 h-4" />
                  </button>
                </HintTooltip>
              </div>


            </div>
          </div>

          <div className="mb-8 sticky top-4 md:top-8 z-[50]">
            {isQuickActionBarOpen ? (
              <InventoryQuickActionBar
                quickSearch={quickAction.quickSearch}
                setQuickSearch={quickAction.setQuickSearch}
                quickQty={quickAction.quickQty}
                setQuickQty={quickAction.setQuickQty}
                quickType={quickAction.quickType}
                setQuickType={quickAction.setQuickType}
                isSearchFocused={quickAction.isSearchFocused}
                setIsSearchFocused={quickAction.setIsSearchFocused}
                filteredItems={quickAction.filteredItems}
                selectedQuickItem={quickAction.selectedQuickItem}
                quickBadgeStyles={quickAction.quickBadgeStyles}
                frequentItems={frequentItems}
                itemsToOrderCount={itemsToOrder.length}
                isQuickPending={quickAction.isQuickPending}
                isReadOnly={isReadOnly}
                onSubmit={quickAction.handleQuickSubmit}
                onOpenPurchaseOrder={handleOpenPurchaseOrders}
                onOpenAddItem={() => setShowAddModal(true)}
                onOpenHistory={handleOpenHistory}
                onPreloadPurchaseOrder={preloadPurchaseOrdersModal}
                onPreloadHistory={preloadInventoryHistoryModal}
                bulkMode={quickAction.bulkMode}
                onBulkModeChange={quickAction.setBulkMode}
                bulkQueue={quickAction.bulkQueue}
                bulkPreviews={quickAction.bulkPreviews}
                bulkSubmitReady={quickAction.bulkSubmitReady}
                onSelectBulkItem={quickAction.selectBulkQuickItem}
                onAddBulkFromSearch={quickAction.addBulkItemFromSearch}
                onBulkPaste={quickAction.handleBulkPaste}
                onRemoveBulkItem={quickAction.removeBulkItem}
                onBulkLineQtyChange={quickAction.setBulkLineQty}
                onClearBulkQueue={quickAction.clearBulkQueue}
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsQuickActionBarOpen(true)}
                aria-expanded={false}
                className="w-full rounded-3xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm transition-colors hover:bg-muted/50"
              >
                เปิด Quick Action
              </button>
            )}
          </div>

          <div className={cn(isReadOnly && 'pointer-events-none opacity-60')}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStartRows}
            onDragEnd={handleDragEndRows}
            modifiers={[restrictToWindowEdges]}
          >
            {isDesktopLayout ? (
            <div className="w-full pb-6">
              {items.length === 0 ? (
                <div className="p-8 text-center text-base font-normal text-foreground/40 bg-card border border-border rounded-3xl">
                  ไม่มีข้อมูลสินค้าในระบบ กรุณากด &quot;เพิ่มสินค้า&quot; นะคะ
                </div>
              ) : (
                <SortableContext items={sortableItemIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <SortableRow
                        key={item.id}
                        item={item}
                        index={index}
                        columnById={columnById}
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
            ) : (
            <div className="w-full space-y-4 mb-8">
              {items.length === 0 ? (
                <div className="p-8 text-center text-base font-normal text-foreground/40 bg-card border border-border rounded-3xl">
                  ไม่มีข้อมูลสินค้าในระบบ กรุณากด &quot;เพิ่มสินค้า&quot; นะคะ
                </div>
              ) : (
                <SortableContext items={sortableItemIds} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <MobileSortableRow
                        key={item.id}
                        item={item}
                        index={index}
                        totalItems={items.length}
                        columnById={columnById}
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
            )}
          </DndContext>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={fadeOverlay.initial} animate={fadeOverlay.animate} exit={fadeOverlay.exit} transition={fadeOverlay.transition}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
            onClick={() => { setShowAddModal(false); setNewItemInsertPosition(''); }}
          >
          <motion.div
            initial={modalContent.initial} animate={modalContent.animate} exit={modalContent.exit} transition={modalContent.transition}
            className="relative bg-card border border-border rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <HintTooltip tip="ปิด">
              <button onClick={() => { setShowAddModal(false); setNewItemInsertPosition(''); }} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors z-10" aria-label="ปิด">
                <X className="w-5 h-5" />
              </button>
            </HintTooltip>
            <div className="px-6 h-14 border-b border-border flex items-center justify-between shrink-0 pr-14">
              <h2 className="text-lg font-normal text-foreground">เพิ่มรายการใหม่</h2>
            </div>
              <form onSubmit={handleAddItemSubmit} className="p-6 overflow-y-auto bb-smooth-scroll flex-1 min-h-0">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <label className="text-[12px] font-normal text-muted-foreground ml-1 uppercase tracking-wider">ชื่อรายการ</label>
                    <input
                      required
                      value={newItemData.name || ''}
                      onChange={e => setNewItemData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full h-11 px-4 bg-background border border-border focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 rounded-3xl text-base md:text-sm font-normal text-foreground outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-normal text-muted-foreground ml-1">คงเหลือ</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formatNumericFormValue(newItemData.stock)}
                      onChange={e => {
                        let val = e.target.value.replace(/[^0-9.]/g, '');
                        if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) val = val.replace(/^0+/, '');
                        setNewItemData(prev => ({ ...prev, stock: val }));
                      }}
                      className="w-full h-11 px-4 bg-muted border border-border focus:border-foreground/20 rounded-3xl text-base md:text-sm font-normal text-foreground outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-normal text-muted-foreground ml-1">หน่วย</label>
                    <input
                      value={newItemData.unit === null || newItemData.unit === undefined ? '' : newItemData.unit}
                      onChange={e => setNewItemData(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full h-11 px-4 bg-muted border border-border focus:border-foreground/20 rounded-3xl text-base md:text-sm font-normal text-foreground outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-normal text-muted-foreground ml-1">จุดสั่งซื้อ</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formatNumericFormValue(newItemData.order_point)}
                      onChange={e => {
                        let val = e.target.value.replace(/[^0-9.]/g, '');
                        if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) val = val.replace(/^0+/, '');
                        setNewItemData(prev => ({ ...prev, order_point: val }));
                      }}
                      className="w-full h-11 px-4 bg-muted border border-border focus:border-foreground/20 rounded-3xl text-base md:text-sm font-normal text-foreground outline-none transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-normal text-muted-foreground ml-1">จำนวนที่ต้องมี</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formatNumericFormValue(newItemData.target_stock)}
                      onChange={e => {
                        let val = e.target.value.replace(/[^0-9.]/g, '');
                        if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) val = val.replace(/^0+/, '');
                        setNewItemData(prev => ({ ...prev, target_stock: val }));
                      }}
                      className="w-full h-11 px-4 bg-muted border border-border focus:border-foreground/20 rounded-3xl text-base md:text-sm font-normal text-foreground outline-none transition-all"
                    />
                  </div>

                  <div className="col-span-2 flex flex-col gap-1.5">
                    <label className="text-[12px] font-normal text-muted-foreground ml-1">ช่องทางสั่งซื้อ</label>
                    <input
                      value={newItemData.source === null || newItemData.source === undefined ? '' : newItemData.source}
                      onChange={e => setNewItemData(prev => ({ ...prev, source: e.target.value }))}
                      className="w-full h-11 px-4 bg-muted border border-border focus:border-foreground/20 rounded-3xl text-base md:text-sm font-normal text-foreground outline-none transition-all"
                    />
                  </div>

                  <fieldset className="col-span-2 flex flex-col gap-2">
                    <legend className="text-[12px] font-normal text-muted-foreground ml-1">วิธีตรวจนับ</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {COUNT_POLICY_OPTIONS.map((option) => {
                        const currentPolicy = normalizeCountPolicy(newItemData.count_policy);
                        return (
                          <label
                            key={option.value}
                            className={cn(
                              'flex min-h-12 cursor-pointer flex-col justify-center rounded-2xl border px-3 py-2 text-sm transition-colors',
                              currentPolicy === option.value
                                ? option.value === 'exact_count'
                                  ? 'bb-pastel-surface border-[#bfdbfe] bg-[#dbeafe] text-black'
                                  : 'bb-pastel-surface border-[#f5c6cb] bg-[#f8d7da] text-black'
                                : 'border-border bg-muted text-foreground hover:bg-card',
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="new-item-count-policy"
                                checked={currentPolicy === option.value}
                                onChange={() => setNewItemData(prev => ({ ...prev, count_policy: option.value }))}
                                className="accent-current"
                              />
                              <span>{option.label}</span>
                            </span>
                            <span className="mt-0.5 text-[11px] opacity-65">{option.description}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className="col-span-2 flex flex-col gap-1.5">
                    <label className="text-[12px] font-normal text-muted-foreground ml-1 flex items-center gap-1">
                      แทรกที่ลำดับ
                      <span className="text-muted-foreground/70">(ค่าเริ่มต้น: ท้ายสุด = {items.length + 1})</span>
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
                  <button type="button" onClick={() => { setShowAddModal(false); setNewItemInsertPosition(''); }} className="flex-1 py-3 px-4 bg-muted hover:bg-muted/80 border border-border rounded-3xl text-[14px] font-normal text-foreground transition-colors">
                    ยกเลิก
                  </button>
                  <button type="submit" className="flex-1 py-3 px-4 bg-foreground hover:opacity-90 rounded-3xl text-[14px] font-normal text-background transition-colors shadow-sm">
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
          <motion.div initial={fadeOverlay.initial} animate={fadeOverlay.animate} exit={fadeOverlay.exit} transition={fadeOverlay.transition} className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
            <motion.div initial={modalContent.initial} animate={modalContent.animate} exit={modalContent.exit} transition={modalContent.transition} className="relative bg-card rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] w-full max-w-sm p-6 text-center">
              <HintTooltip tip="ปิด">
                <button onClick={() => setDeleteId(null)} className="absolute top-4 right-4 p-2 text-foreground/40 hover:text-foreground hover:bg-black/5 rounded-full transition-colors z-10" aria-label="ปิด">
                  <X className="w-5 h-5" />
                </button>
              </HintTooltip>
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 mt-2">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-normal text-foreground mb-2">ต้องการลบรายการนี้ใช่หรือไม่?</h3>
              <p className="text-sm font-normal text-foreground mb-6">ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนได้</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-3 px-4 bg-muted hover:bg-muted/80 border border-border rounded-3xl text-[14px] font-normal text-foreground transition-colors">
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
            historyTypeFilter={historyTypeFilter}
            onTypeFilterChange={handleHistoryTypeFilterChange}
            onLoadMore={handleLoadMoreHistory}
            hasMoreHistory={hasMoreHistory}
            isHistoryLoading={isHistoryLoading}
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
      {(showPurchaseOrderModal || isExportingPO) && (
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
      )}
    </>
  );
}