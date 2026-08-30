'use client';

import { useEffect, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { FadeModalScaffold } from '@/components/ui/fade-modal-scaffold';
import { ModalPortal } from '@/components/ui/modal-portal';
import { INVENTORY_MODAL_Z_CLASS } from '@/lib/floating-action-layout';
import { cn } from '@/lib/utils';
import { SECRETARY_MODAL_LAYOUT_CLASS, SECRETARY_MODAL_SCAFFOLD_PROPS } from './secretary-modal-layout';

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

  useEffect(() => {
    if (!open) {
      setConfirmDelete(false);
    }
  }, [open]);

  const dialogTitle = mode === 'create' ? 'เพิ่มงาน' : 'แก้ไขงาน';
  const canSave = title.trim().length > 0 && !isPending;

  return (
    <ModalPortal>
      <FadeModalScaffold
        open={open}
        onClose={onClose}
        zIndex={220}
        {...SECRETARY_MODAL_SCAFFOLD_PROPS}
        overlayClassName={cn('bg-black/20 backdrop-blur-sm', INVENTORY_MODAL_Z_CLASS)}
        layoutClassName={SECRETARY_MODAL_LAYOUT_CLASS}
        panelClassName="w-full max-w-lg"
        aria-label={dialogTitle}
      >
        <div className="flex max-h-[min(80svh,32rem)] w-full flex-col overflow-hidden rounded-3xl border border-border bg-card md:rounded-3xl">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="text-[15px] font-normal text-foreground">{dialogTitle}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิด"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted/50"
            >
              <X size={16} />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 bb-smooth-scroll [scrollbar-width:thin]">
            <label className="block space-y-1.5">
              <span className="text-[13px] text-muted-foreground">ชื่องาน</span>
              <input
                type="text"
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder="เช่น ตรวจสต็อกเคาน์เตอร์"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[14px] text-foreground"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    if (canSave) onSave();
                  }
                }}
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[13px] text-muted-foreground">รายละเอียด</span>
              <textarea
                value={description}
                onChange={(event) => onDescriptionChange(event.target.value)}
                placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
                rows={5}
                className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-[14px] leading-relaxed text-foreground"
              />
            </label>
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t border-border px-4 py-3">
            {mode === 'edit' && onDelete ? (
              confirmDelete ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={isPending}
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground disabled:opacity-60"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    disabled={isPending}
                    className="flex-1 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[13px] text-red-700 dark:text-red-300 disabled:opacity-60"
                  >
                    ยืนยันลบ
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={isPending}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[13px] text-muted-foreground hover:text-foreground disabled:opacity-60"
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
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-[13px] text-foreground disabled:opacity-60"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={!canSave}
                className="flex-1 rounded-xl bg-foreground px-3 py-2 text-[13px] text-background disabled:opacity-60"
              >
                {mode === 'create' ? 'เพิ่มงาน' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      </FadeModalScaffold>
    </ModalPortal>
  );
}
