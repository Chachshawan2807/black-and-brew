'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { formatDueDateWithDaysRemaining } from '@/lib/maintenance/compute-upcoming-maintenance';
import {
  formatBeanOrderIncompleteStatusSummary,
  shouldIncludeIncompleteBeanOrder,
} from '@/lib/bean-orders/workflow-status';
import {
  BRANCH_WITHDRAW_ORDER_SOURCE,
  computePurchaseOrderDerivedState,
  getStockColorClass,
} from '@/lib/inventory-stock';
import {
  deleteManualSecretaryTask,
  updateManualSecretaryTask,
} from '@/app/actions/secretary-actions';
import { isManualSecretaryTask } from '@/lib/secretary/is-manual-task';
import { resolveSecretaryTaskOverlayKind } from '@/lib/secretary/resolve-task-overlay';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';
import BranchWithdrawOverlay from './BranchWithdrawOverlay';
import SecretaryListDialog, { type SecretaryListDialogItem } from './SecretaryListDialog';
import SecretaryManualTaskDialog from './SecretaryManualTaskDialog';

const PurchaseOrdersModal = dynamic(
  () => import('@/app/[locale]/inventory/_components/PurchaseOrdersModal'),
  { ssr: false },
);

type SecretaryTaskOverlayProps = {
  task: SecretaryTask | null;
  snapshot: SecretarySnapshot;
  locale: string;
  onClose: () => void;
  onTaskUpdated: (task: SecretaryTask) => void;
  onTaskDeleted: (taskId: string) => void;
  isPending?: boolean;
};

function filterBeanOrdersForTask(snapshot: SecretarySnapshot): SecretaryListDialogItem[] {
  return snapshot.operational.pendingBeanOrders
    .filter((order) => shouldIncludeIncompleteBeanOrder(order))
    .map((order, index) => ({
      id: `${order.customerName}-${index}`,
      primary: order.customerName,
      secondary: formatBeanOrderIncompleteStatusSummary(order),
    }));
}

function filterMaintenanceForTask(
  task: SecretaryTask,
  snapshot: SecretarySnapshot,
): SecretaryListDialogItem[] {
  const tasks =
    task.task_type === 'maintenance_overdue'
      ? snapshot.maintenanceTasks.filter((entry) => entry.urgency === 'overdue')
      : snapshot.maintenanceTasks.filter(
          (entry) => entry.urgency === 'within_7_days' || entry.urgency === 'within_30_days',
        );

  return tasks.map((entry) => ({
    id: entry.id,
    primary: entry.equipment,
    secondary: [
      formatDueDateWithDaysRemaining(entry.dueDate, snapshot.dateIso),
      entry.advice,
    ]
      .filter(Boolean)
      .join(' · '),
  }));
}

export default function SecretaryTaskOverlay({
  task,
  snapshot,
  locale,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
  isPending: parentPending = false,
}: SecretaryTaskOverlayProps) {
  const overlayKind = task ? resolveSecretaryTaskOverlayKind(task) : null;
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['all']);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSelectedChannels(['all']);
  }, [task?.id]);

  useEffect(() => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDescription(task.description ?? '');
  }, [task?.id, task?.title, task?.description]);

  const purchaseState = useMemo(() => {
    if (!task || overlayKind !== 'purchase_orders') return null;
    return computePurchaseOrderDerivedState(snapshot.itemsToOrder, selectedChannels, {
      excludeFromAllSources: [BRANCH_WITHDRAW_ORDER_SOURCE],
    });
  }, [overlayKind, selectedChannels, snapshot.itemsToOrder, task]);

  const beanListItems = useMemo(
    () => (task && overlayKind === 'bean_orders_list' ? filterBeanOrdersForTask(snapshot) : []),
    [overlayKind, snapshot, task],
  );

  const maintenanceListItems = useMemo(
    () =>
      task && overlayKind === 'maintenance_list' ? filterMaintenanceForTask(task, snapshot) : [],
    [overlayKind, snapshot, task],
  );

  if (!task || !overlayKind) return null;

  const pending = isPending || parentPending;

  const handleSaveManualTask = () => {
    const title = editTitle.trim();
    if (!title) return;

    startTransition(async () => {
      const result = await updateManualSecretaryTask({
        taskId: task.id,
        title,
        description: editDescription.trim() || undefined,
      });
      if (!result.success || !result.task) return;
      onTaskUpdated(result.task);
      onClose();
    });
  };

  const handleDeleteManualTask = () => {
    startTransition(async () => {
      const result = await deleteManualSecretaryTask(task.id);
      if (!result.success) return;
      onTaskDeleted(task.id);
      onClose();
    });
  };

  if (overlayKind === 'purchase_orders') {
    if (!purchaseState) return null;
    return (
      <PurchaseOrdersModal
        onClose={onClose}
        selectedChannels={selectedChannels}
        setSelectedChannels={setSelectedChannels}
        itemsToOrder={purchaseState.itemsToOrder}
        poSources={purchaseState.poSources}
        displayedPoItems={purchaseState.displayedPoItems}
        allTabItemCount={purchaseState.allTabItemCount}
        getStockColorClass={getStockColorClass}
      />
    );
  }

  if (overlayKind === 'branch_withdraw_panel') {
    return (
      <BranchWithdrawOverlay
        locale={locale}
        seedItems={snapshot.branchWithdrawItems}
        onClose={onClose}
      />
    );
  }

  if (overlayKind === 'bean_orders_list') {
    return (
      <SecretaryListDialog
        open
        title={task.title}
        items={beanListItems}
        emptyMessage="ไม่มีออเดอร์ในหมวดนี้"
        onClose={onClose}
      />
    );
  }

  if (overlayKind === 'maintenance_list') {
    return (
      <SecretaryListDialog
        open
        title={task.title}
        items={maintenanceListItems}
        emptyMessage="ไม่มีรายการซ่อมบำรุงในหมวดนี้"
        onClose={onClose}
      />
    );
  }

  if (isManualSecretaryTask(task)) {
    return (
      <SecretaryManualTaskDialog
        open
        mode="edit"
        title={editTitle}
        description={editDescription}
        isPending={pending}
        onTitleChange={setEditTitle}
        onDescriptionChange={setEditDescription}
        onClose={onClose}
        onSave={handleSaveManualTask}
        onDelete={handleDeleteManualTask}
      />
    );
  }

  return (
    <SecretaryListDialog
      open
      title={task.title}
      items={
        task.description
          ? [{ id: 'description', primary: task.description }]
          : []
      }
      emptyMessage="ไม่มีรายละเอียดเพิ่มเติม"
      onClose={onClose}
    />
  );
}
