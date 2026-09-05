'use client';

import { LoadingIcon } from '@/components/ui/loading-icon';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, ICON_STROKE } from '@/lib/icons';
import {
  INVENTORY_MODAL_OVERLAY,
  INVENTORY_MODAL_PANEL,
  INVENTORY_MODAL_PANEL_SHEET,
  InventoryModalHeader,
  InventoryEmptyState,
  useInventoryMotion,
} from './inventory-ui-primitives';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCorners,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  getModalBackdropKeyboardAwareStyle,
  getModalContentKeyboardAwareStyle,
} from '@/lib/keyboard-aware-panel-style';
import { SortableDragHandle } from '@/components/ui/sortable-drag-handle';
import { INVENTORY_MODAL_Z_CLASS } from '@/lib/floating-action-layout';
import { useVisualViewportInsets } from '@/hooks/use-visual-viewport-insets';
import { useSafeDndSensors } from '@/lib/dnd-sensors';
import type { InventoryStockFields } from '@/lib/inventory-stock';
import { InventoryModalPortal } from './InventoryModalPortal';

export type WithdrawRequiredItemRow = InventoryStockFields & {
  id: string;
  name: string;
  unit?: string;
  stock?: number | string | null;
};

type WithdrawRequiredItemsModalProps = {
  items: WithdrawRequiredItemRow[];
  onClose: () => void;
  onReorder: (orderedIds: string[]) => void | Promise<void>;
  isReadOnly?: boolean;
  isSaving?: boolean;
};

function SortableWithdrawRow({
  item,
  index,
  dragDisabled,
}: {
  item: WithdrawRequiredItemRow;
  index: number;
  dragDisabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: dragDisabled });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: transition || 'transform 150ms cubic-bezier(0.2, 0, 0, 1)',
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-1 px-1 py-1 md:px-2 text-sm min-w-0 bg-card',
        isDragging && 'bb-shadow-md rounded-xl',
      )}
    >
      <SortableDragHandle
        attributes={attributes}
        listeners={listeners}
        setActivatorNodeRef={setActivatorNodeRef}
        disabled={dragDisabled}
        className="h-10 w-10"
      />
      <span className="shrink-0 w-6 text-center text-[12px] tabular-nums text-muted-foreground">
        {index + 1}
      </span>
      <span className="flex-1 min-w-0 truncate text-foreground font-normal">
        {item.name}
      </span>
    </li>
  );
}

export default function WithdrawRequiredItemsModal({
  items,
  onClose,
  onReorder,
  isReadOnly = false,
  isSaving = false,
}: WithdrawRequiredItemsModalProps) {
  const viewportInsets = useVisualViewportInsets();
  const modalBackdropStyle = getModalBackdropKeyboardAwareStyle({ insets: viewportInsets });
  const modalContentStyle = getModalContentKeyboardAwareStyle({ insets: viewportInsets });
  const sensors = useSafeDndSensors();
  const { overlay, sheet } = useInventoryMotion();
  const [orderedItems, setOrderedItems] = useState(items);
  const [prevItems, setPrevItems] = useState(items);
  const dragDisabled = isReadOnly || isSaving;

  if (items !== prevItems) {
    setPrevItems(items);
    setOrderedItems(items);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (dragDisabled) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedItems.findIndex((item) => item.id === active.id);
    const newIndex = orderedItems.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const nextItems = arrayMove(orderedItems, oldIndex, newIndex);
    setOrderedItems(nextItems);
    void onReorder(nextItems.map((item) => item.id));
  };

  return (
    <InventoryModalPortal>
      <motion.div
        initial={overlay.initial}
        animate={overlay.animate}
        exit={overlay.exit}
        transition={overlay.transition}
        className={cn(
          'fixed inset-0 flex items-end md:items-center justify-center p-0 md:p-4 transition-[padding,height] duration-200',
          INVENTORY_MODAL_OVERLAY,
          INVENTORY_MODAL_Z_CLASS,
        )}
        style={modalBackdropStyle}
        onClick={onClose}
      >
        <motion.div
          initial={sheet.initial}
          animate={sheet.animate}
          exit={sheet.exit}
          transition={sheet.transition}
          className={cn(INVENTORY_MODAL_PANEL, INVENTORY_MODAL_PANEL_SHEET, 'md:max-w-sm transition-[max-height] duration-200')}
          style={modalContentStyle}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="withdraw-required-title"
        >
          <InventoryModalHeader
            icon={<ClipboardList className="w-5 h-5" strokeWidth={ICON_STROKE} aria-hidden />}
            title="รายการที่ต้องเบิก"
            subtitle={`${orderedItems.length} รายการ ลากเพื่อเปลี่ยนลำดับ`}
            onClose={onClose}
            closeLabel="ปิดรายการที่ต้องเบิก"
          />

          <div className="flex-1 min-h-0 overflow-y-auto bb-smooth-scroll px-4 py-4 md:px-6 md:py-4 bg-background">
            {orderedItems.length === 0 ? (
              <InventoryEmptyState
                icon={<ClipboardList className="w-8 h-8" strokeWidth={ICON_STROKE} />}
                message="ยังไม่มีรายการที่ตั้งเป็นต้องเบิก"
                className="py-6"
              />
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                <SortableContext items={orderedItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                  <ul className="divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden">
                    {orderedItems.map((item, index) => (
                      <SortableWithdrawRow
                        key={item.id}
                        item={item}
                        index={index}
                        dragDisabled={dragDisabled}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {isSaving && (
            <div className="shrink-0 border-t border-border px-4 py-2 text-[12px] text-muted-foreground flex items-center gap-2 justify-center">
              <LoadingIcon size="sm" className="aria-hidden" />
              กำลังบันทึกลำดับ...
            </div>
          )}
        </motion.div>
      </motion.div>
    </InventoryModalPortal>
  );
}
