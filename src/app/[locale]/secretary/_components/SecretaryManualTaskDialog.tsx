'use client';

import { useEffect, useId, useState } from 'react';
import { Trash2 } from '@/lib/icons';
import { cn } from '@/lib/utils';
import SecretaryTaskPanelShell from './SecretaryTaskPanelShell';

type SecretaryManualTaskDialogProps = {
  open: boolean;
  mode: 'create' | 'edit';
  title: string;
  description: string;
  isPending?: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
};

const FIELD_CLASS =
  'w-full rounded-xl border border-border bg-background px-3 py-2.5 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-1 focus-visible:ring-offset-card';

const BUTTON_SECONDARY_CLASS =
  'flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 disabled:opacity-60';

const BUTTON_PRIMARY_CLASS =
  'flex-1 rounded-xl bg-foreground px-3 py-2.5 text-[13px] text-background transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-1 focus-visible:ring-offset-card disabled:opacity-60';

export default function SecretaryManualTaskDialog({
  open,
  mode,
  title,
  description,
  isPending = false,
  onTitleChange,
  onDescriptionChange,
  onClose,
  onSave,
  onDelete,
}: SecretaryManualTaskDialogProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      setConfirmDelete(false);
    }
  }, [open]);

  const dialogTitle = mode === 'create' ? 'เพิ่มงาน' : 'แก้ไขงาน';
  const dialogSubtitle =
    mode === 'create' ? 'สร้างงานใหม่สำหรับกระดานเลขา' : 'ปรับชื่องานหรือรายละเอียด';
  const canSave = title.trim().length > 0 && !isPending;
  const titleInvalid = title.trim().length === 0;

  const footer = (
    <>
      {mode === 'edit' && onDelete ? (
        confirmDelete ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={isPending}
              className={BUTTON_SECONDARY_CLASS}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={isPending}
              className="flex-1 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-[13px] text-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 disabled:opacity-60 dark:text-red-300"
            >
              ยืนยันลบ
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 disabled:opacity-60"
          >
            <Trash2 size={14} />
            ลบงาน
          </button>
        )
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className={BUTTON_SECONDARY_CLASS}
        >
          ยกเลิก
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className={BUTTON_PRIMARY_CLASS}
        >
          {isPending
            ? 'กำลังบันทึก...'
            : mode === 'create'
              ? 'เพิ่มงาน'
              : 'บันทึก'}
        </button>
      </div>
    </>
  );

  return (
    <SecretaryTaskPanelShell
      open={open}
      title={dialogTitle}
      subtitle={dialogSubtitle}
      onClose={onClose}
      closeDisabled={isPending}
      maxWidthClass="max-w-lg"
      footer={footer}
    >
      <div className="space-y-3 pb-1">
        <div className="space-y-1.5">
          <label htmlFor={titleId} className="block text-[13px] text-muted-foreground">
            ชื่องาน
          </label>
          <input
            id={titleId}
            type="text"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="เช่น ตรวจสต็อกเคาน์เตอร์"
            required
            aria-invalid={titleInvalid}
            className={cn(
              FIELD_CLASS,
              'user-invalid:border-red-500/50 user-invalid:ring-red-500/20',
            )}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                if (canSave) onSave();
              }
            }}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={descriptionId} className="block text-[13px] text-muted-foreground">
            รายละเอียด
          </label>
          <textarea
            id={descriptionId}
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
            rows={5}
            className={cn(FIELD_CLASS, 'resize-y leading-relaxed')}
          />
        </div>
      </div>
    </SecretaryTaskPanelShell>
  );
}
