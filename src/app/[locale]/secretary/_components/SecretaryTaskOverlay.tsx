'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect, useMemo, useState, useTransition } from 'react';
import { formatDueDateWithDaysRemaining } from '@/lib/maintenance/compute-upcoming-maintenance';
import {
  computePurchaseOrderDerivedState,
  getStockColorClass,
  BRANCH_WITHDRAW_ORDER_SOURCE,
} from '@/lib/inventory-stock';
import {
  deleteManualSecretaryTask,
  updateManualSecretaryTask,
} from '@/app/actions/secretary-actions';
import type { SecretaryBoardDisplayTask } from '@/lib/secretary/consolidate-board-tasks';
import { buildScheduleReviewListItems } from '@/lib/secretary/build-schedule-review-list-items';
import { preloadSecretaryOverlayForTask } from '@/lib/secretary/preload-secretary-overlay';
import { resolveSecretaryTaskDetailText } from '@/lib/secretary/resolve-task-detail-text';
import { resolveSecretaryTaskOverlayKind } from '@/lib/secretary/resolve-task-overlay';
import { canOpenSecretaryTaskDetail } from '@/lib/secretary/task-detail-overlay';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';
import type { SecretaryAttentionListItem } from '@/lib/secretary/task-detail-overlay';
import { SecretaryOverlaySuspenseShell } from './SecretaryOverlaySuspenseShell';

const PurchaseOrdersModal = dynamic(
  () => import('@/app/[locale]/inventory/_components/PurchaseOrdersModal'),
  { ssr: false },
);
const BeanOrdersOverlay = dynamic(() => import('./BeanOrdersOverlay'), { ssr: false });
const BranchWithdrawOverlay = dynamic(() => import('./BranchWithdrawOverlay'), { ssr: false });
const SecretaryManualTaskDialog = dynamic(() => import('./SecretaryManualTaskDialog'), {
  ssr: false,
});
const SecretaryTaskInfoOverlay = dynamic(() => import('./SecretaryTaskInfoOverlay'), {
  ssr: false,
});
const SecretaryTaskListOverlay = dynamic(() => import('./SecretaryTaskListOverlay'), {
  ssr: false,
});

type SecretaryTaskOverlayProps = {
  task: SecretaryBoardDisplayTask | null;
  snapshot: SecretarySnapshot;
  locale: string;
  onClose: () => void;
  onTaskUpdated: (task: SecretaryTask) => void;
  onTaskDeleted: (taskId: string) => void;
  isPending?: boolean;
};

function filterMaintenanceForTask(
  task: SecretaryTask,
  snapshot: SecretarySnapshot,
): SecretaryAttentionListItem[] {
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
  const overlayKind =
    task && canOpenSecretaryTaskDetail(task) ? resolveSecretaryTaskOverlayKind(task) : null;
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

  const maintenanceListItems = useMemo(
    () =>
      task && overlayKind === 'maintenance_list'
        ? filterMaintenanceForTask(task, snapshot)
        : [],
    [overlayKind, snapshot, task],
  );

  const scheduleReviewListItems = useMemo(
    () =>
      task && overlayKind === 'schedule_review_list'
        ? buildScheduleReviewListItems(task)
        : [],
    [overlayKind, task],
  );

  useEffect(() => {
    if (overlayKind && task) {
      preloadSecretaryOverlayForTask(task);
    }
  }, [overlayKind, task]);

  if (!task || !overlayKind) return null;

  const pending = isPending || parentPending;
  const taskDetailText = resolveSecretaryTaskDetailText(task);

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
      <Suspense
        fallback={
          <SecretaryOverlaySuspenseShell
            title={task.title}
            onClose={onClose}
            maxWidthClass="max-w-4xl"
            variant="purchase"
            label="กำลังเปิดรายการสั่งซื้อ..."
          />
        }
      >
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
      </Suspense>
    );
  }

  if (overlayKind === 'branch_withdraw_panel') {
    return (
      <Suspense
        fallback={
          <SecretaryOverlaySuspenseShell
            title="เบิกของสาขา 2"
            onClose={onClose}
            variant="embed"
            label="กำลังเปิดหน้าเบิกของ..."
          />
        }
      >
        <BranchWithdrawOverlay
          locale={locale}
          seedItems={snapshot.branchWithdrawItems}
          catalogSeedItems={snapshot.inventoryCatalogItems}
          onClose={onClose}
        />
      </Suspense>
    );
  }

  if (overlayKind === 'bean_orders_panel') {
    return (
      <Suspense
        fallback={
          <SecretaryOverlaySuspenseShell
            title={task.title}
            onClose={onClose}
            maxWidthClass="max-w-4xl"
            variant="embed"
            label="กำลังเปิดออเดอร์เมล็ดกาแฟ..."
          />
        }
      >
        <BeanOrdersOverlay task={task} locale={locale} onClose={onClose} />
      </Suspense>
    );
  }

  if (overlayKind === 'maintenance_list') {
    return (
      <Suspense
        fallback={
          <SecretaryOverlaySuspenseShell
            title={task.title}
            onClose={onClose}
            maxWidthClass="max-w-lg"
            variant="list"
            label="กำลังเปิดรายการซ่อมบำรุง..."
          />
        }
      >
        <SecretaryTaskListOverlay
          title={task.title}
          items={maintenanceListItems}
          emptyMessage="ไม่มีรายการซ่อมบำรุงในหมวดนี้"
          onClose={onClose}
        />
      </Suspense>
    );
  }

  if (overlayKind === 'schedule_review_list') {
    return (
      <Suspense
        fallback={
          <SecretaryOverlaySuspenseShell
            title={task.title}
            onClose={onClose}
            maxWidthClass="max-w-lg"
            variant="list"
            label="กำลังเปิดรายละเอียดตารางงาน..."
          />
        }
      >
        <SecretaryTaskListOverlay
          title={task.title}
          items={scheduleReviewListItems}
          emptyMessage="ไม่มีรายละเอียดวันที่ต้องตรวจ"
          onClose={onClose}
        />
      </Suspense>
    );
  }

  if (isManualSecretaryTask(task)) {
    return (
      <Suspense
        fallback={
          <SecretaryOverlaySuspenseShell
            title="แก้ไขงาน"
            onClose={onClose}
            maxWidthClass="max-w-lg"
            variant="form"
            label="กำลังเปิดฟอร์มงาน..."
          />
        }
      >
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
      </Suspense>
    );
  }

  const infoItems = taskDetailText
    ? [{ id: 'description', primary: taskDetailText }]
    : [];

  return (
    <Suspense
      fallback={
        <SecretaryOverlaySuspenseShell
          title={task.title}
          onClose={onClose}
          maxWidthClass="max-w-lg"
          variant="list"
          label="กำลังเปิดรายละเอียดงาน..."
        />
      }
    >
      <SecretaryTaskInfoOverlay
        title={task.title}
        items={infoItems}
        onClose={onClose}
      />
    </Suspense>
  );
}
