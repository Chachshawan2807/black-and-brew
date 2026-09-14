'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect, useState, useTransition } from 'react';
import {
  deleteManualSecretaryTask,
  updateManualSecretaryTask,
} from '@/app/actions/home-actions';
import type { SecretaryBoardDisplayTask } from '@/lib/secretary/consolidate-board-tasks';
import { isManualSecretaryTask } from '@/lib/secretary/is-manual-task';
import type { SecretaryTask } from '@/lib/secretary/types';
import { SecretaryOverlaySuspenseShell } from './SecretaryOverlaySuspenseShell';

const SecretaryManualTaskDialog = dynamic(() => import('./SecretaryManualTaskDialog'), {
  ssr: false,
});

type SecretaryTaskOverlayProps = {
  task: SecretaryBoardDisplayTask | null;
  locale: string;
  onClose: () => void;
  onTaskUpdated: (task: SecretaryTask) => void;
  onTaskDeleted: (taskId: string) => void;
  isPending?: boolean;
};

export default function SecretaryTaskOverlay({
  task,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
  isPending: parentPending = false,
}: SecretaryTaskOverlayProps) {
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDescription(task.description ?? '');
  }, [task?.id, task?.title, task?.description]);

  if (!task || !isManualSecretaryTask(task)) return null;

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
