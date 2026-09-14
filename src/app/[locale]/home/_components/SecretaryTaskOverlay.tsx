'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  deleteManualSecretaryTask,
  updateManualSecretaryTask,
} from '@/app/actions/home-actions';
import type { SecretaryBoardDisplayTask } from '@/lib/secretary/consolidate-board-tasks';
import { isManualSecretaryTask } from '@/lib/secretary/is-manual-task';
import type { SecretaryTask } from '@/lib/secretary/types';
import SecretaryManualTaskDialog from './SecretaryManualTaskDialog';

type SecretaryTaskOverlayProps = {
  task: SecretaryBoardDisplayTask | null;
  locale: string;
  onClose: () => void;
  onTaskUpdated: (task: SecretaryTask) => void;
  onTaskDeleted: (taskId: string) => void;
  isPending?: boolean;
};

export default function SecretaryTaskOverlay(props: SecretaryTaskOverlayProps) {
  const { task } = props;
  if (!task || !isManualSecretaryTask(task)) return null;
  return <SecretaryManualTaskOverlayContent {...props} task={task} />;
}

function SecretaryManualTaskOverlayContent({
  task,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
  isPending: parentPending = false,
}: SecretaryTaskOverlayProps & { task: SecretaryBoardDisplayTask }) {
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setEditTitle(task.title);
    setEditDescription(task.description ?? '');
  }, [task.id, task.title, task.description]);

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
