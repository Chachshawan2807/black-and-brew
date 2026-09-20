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
} from '@/app/actions/home-actions';
import type { SecretaryBoardDisplayTask } from '@/lib/secretary/consolidate-board-tasks';
import { buildBeanOrderListItems, resolveBeanOrderListEmptyMessage } from '@/lib/secretary/build-bean-order-list-items';
import { buildScheduleReviewListItems } from '@/lib/secretary/build-schedule-review-list-items';
import { isManualSecretaryTask } from '@/lib/secretary/is-manual-task';
import { preloadSecretaryOverlayForTask } from '@/lib/secretary/preload-secretary-overlay';
import { buildTaskInfoListItems } from '@/lib/secretary/build-task-info-list-items';
import { resolveSecretaryTaskOverlayKind } from '@/lib/secretary/resolve-task-overlay';
import { canOpenSecretaryTaskDetail } from '@/lib/secretary/task-detail-overlay';
import type { SecretarySnapshot, SecretaryTask } from '@/lib/secretary/types';
import type { SecretaryAttentionListItem } from '@/lib/secretary/task-detail-overlay';
import { SecretaryOverlaySuspenseShell } from './SecretaryOverlaySuspenseShell';

const PurchaseOrdersModal = dynamic(
  () => import('@/app/[locale]/inventory/_components/PurchaseOrdersModal'),
  { ssr: false },
);
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
      : snapshot.maintenanceTasks.filter((entry) => entry.urgency === 'within_7_days');

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
  if (!task) return null;

  return (
    <SecretaryTaskOverlayBody
      key={task.id}
      task={task}
      snapshot={snapshot}
      locale={locale}
      onClose={onClose}
      onTaskUpdated={onTaskUpdated}
      onTaskDeleted={onTaskDeleted}
      parentPending={parentPending}
    />
  );
}

function SecretaryTaskOverlayBody({
  task,
  snapshot,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
  parentPending = false,
}: SecretaryTaskOverlayProps & { parentPending?: boolean }) {
  const overlayKind = canOpenSecretaryTaskDetail(task)
    ? resolveSecretaryTaskOverlayKind(task)
    : null;
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['all']);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description ?? '');
  const [isPending, startTransition] = useTransition();

  const purchaseState = useMemo(() => {
    if (overlayKind !== 'purchase_orders') return null;
    return computePurchaseOrderDerivedState(snapshot.itemsToOrder, selectedChannels, {
      excludeFromAllSources: [BRANCH_WITHDRAW_ORDER_SOURCE],
    });
  }, [overlayKind, selectedChannels, snapshot.itemsToOrder]);

  const maintenanceListItems = useMemo(
    () =>
      overlayKind === 'maintenance_list'
        ? filterMaintenanceForTask(task, snapshot)
        : [],
    [overlayKind, snapshot, task],
  );

  const scheduleReviewListItems = useMemo(
    () =>
      overlayKind === 'schedule_review_list'
        ? buildScheduleReviewListItems(task)
        : [],
    [overlayKind, task],
  );

  const beanOrderListItems = useMemo(
    () =>
      overlayKind === 'bean_orders_list'
        ? buildBeanOrderListItems(task, snapshot)
        : [],
    [overlayKind, snapshot, task],
  );

  const taskInfoListItems = useMemo(
    () =>
      overlayKind === 'task_info' ? buildTaskInfoListItems(task, snapshot) : [],
    [overlayKind, snapshot, task],
  );

  useEffect(() => {
    if (overlayKind) {
      preloadSecretaryOverlayForTask(task);
    }
  }, [overlayKind, task]);

  if (!overlayKind || overlayKind === 'branch_withdraw_panel') return null;

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

  if (overlayKind === 'bean_orders_list') {
    return (
      <Suspense
        fallback={
          <SecretaryOverlaySuspenseShell
            title={task.title}
            onClose={onClose}
            maxWidthClass="max-w-lg"
            variant="list"
            label="กำลังเปิดรายละเอียดออเดอร์เมล็ดกาแฟ..."
          />
        }
      >
        <SecretaryTaskListOverlay
          title={task.title}
          items={beanOrderListItems}
          emptyMessage={resolveBeanOrderListEmptyMessage(task)}
          onClose={onClose}
        />
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
          layout="board-cards"
          module="schedule"
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
        items={taskInfoListItems}
        onClose={onClose}
      />
    </Suspense>
  );
}
