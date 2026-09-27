'use client';

import { useId, useState } from 'react';
import { Trash2 } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { BB_BTN_OUTLINE_DANGER, BB_BTN_OUTLINE_PRIMARY } from '@/lib/ui-outlined-tokens';
import { FadeModalScaffold } from '@/components/ui/fade-modal-scaffold';
import { ModalPortal } from '@/components/ui/modal-portal';
import { INVENTORY_MODAL_Z_CLASS } from '@/lib/floating-action-layout';
import {
  SECRETARY_MODAL_LAYOUT_CLASS,
  SECRETARY_MODAL_OVERLAY_CLASS,
  SECRETARY_MODAL_SCAFFOLD_PROPS,
} from './secretary-modal-layout';
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
  'w-full rounded-2xl border border-border bg-background px-3 py-2.5 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 focus-visible:ring-offset-1 focus-visible:ring-offset-card';

const BUTTON_SECONDARY_CLASS =
  'flex-1 rounded-2xl border border-border bg-background px-3 py-2.5 text-[13px] text-foreground transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 disabled:opacity-60';

const BUTTON_PRIMARY_CLASS = cn(BB_BTN_OUTLINE_PRIMARY, 'flex-1 py-2.5 text-[13px]');

const DELETE_TRIGGER_CLASS =
  'inline-flex w-full min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-red-500/35 bg-transparent px-3 py-2.5 text-[13px] font-normal text-red-600 transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 disabled:opacity-60 touch-manipulation dark:text-red-400';

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
  const titleId = useId();
  const descriptionId = useId();

  if (!open) {
    return null;
  }

  return (
    <SecretaryManualTaskDialogOpen
      mode={mode}
      title={title}
      description={description}
      isPending={isPending}
      onTitleChange={onTitleChange}
      onDescriptionChange={onDescriptionChange}
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
      titleId={titleId}
      descriptionId={descriptionId}
    />
  );
}

function SecretaryManualTaskDialogOpen({
  mode,
  title,
  description,
  isPending = false,
  onTitleChange,
  onDescriptionChange,
  onClose,
  onSave,
  onDelete,
  titleId,
  descriptionId,
}: Omit<SecretaryManualTaskDialogProps, 'open'> & {
  titleId: string;
  descriptionId: string;
}) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const dialogTitle = mode === 'create' ? 'เพิ่มงาน' : 'แก้ไขงาน';
  const dialogSubtitle =
    mode === 'create' ? 'สร้างงานใหม่สำหรับกระดานเลขา' : 'ปรับชื่องานหรือรายละเอียด';
  const canSave = title.trim().length > 0 && !isPending;
  const titleInvalid = title.trim().length === 0;

  const footer = (
    <>
      {mode === 'edit' && onDelete ? (
        <button
          type="button"
          onClick={() => setDeleteConfirmOpen(true)}
          disabled={isPending}
          className={DELETE_TRIGGER_CLASS}
        >
          <Trash2 size={14} className="text-red-600 dark:text-red-400" aria-hidden />
          ลบงาน
        </button>
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
    <>
      <SecretaryTaskPanelShell
        open
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

      {mode === 'edit' && onDelete ? (
        <ModalPortal>
          <FadeModalScaffold
            open={deleteConfirmOpen}
            onClose={isPending ? undefined : () => setDeleteConfirmOpen(false)}
            zIndex={230}
            {...SECRETARY_MODAL_SCAFFOLD_PROPS}
            overlayClassName={cn(SECRETARY_MODAL_OVERLAY_CLASS, INVENTORY_MODAL_Z_CLASS)}
            layoutClassName={SECRETARY_MODAL_LAYOUT_CLASS}
            panelClassName="w-full max-w-sm rounded-2xl border border-border bg-card p-4 bb-shadow-lg"
            aria-label="ยืนยันการลบงาน"
          >
            <h3 className="text-[15px] font-normal text-foreground">ลบงานนี้?</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              งานจะหายจากกระดานและกู้คืนไม่ได้
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={isPending}
                className={cn(BUTTON_SECONDARY_CLASS, 'sm:flex-1')}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  onDelete();
                }}
                disabled={isPending}
                className={cn(BB_BTN_OUTLINE_DANGER, 'w-full sm:flex-1 py-2.5 text-[13px]')}
              >
                {isPending ? 'กำลังลบ...' : 'ยืนยันการลบ'}
              </button>
            </div>
          </FadeModalScaffold>
        </ModalPortal>
      ) : null}
    </>
  );
}
