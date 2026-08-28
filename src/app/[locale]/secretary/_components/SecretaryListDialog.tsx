'use client';

import { X } from 'lucide-react';
import { FadeModalScaffold } from '@/components/ui/fade-modal-scaffold';
import { ModalPortal } from '@/components/ui/modal-portal';
import { INVENTORY_MODAL_Z_CLASS } from '@/lib/floating-action-layout';
import { cn } from '@/lib/utils';

export type SecretaryListDialogItem = {
  id: string;
  primary: string;
  secondary?: string;
};

type SecretaryListDialogProps = {
  open: boolean;
  title: string;
  items: SecretaryListDialogItem[];
  emptyMessage?: string;
  onClose: () => void;
};

export default function SecretaryListDialog({
  open,
  title,
  items,
  emptyMessage = 'ไม่มีรายการ',
  onClose,
}: SecretaryListDialogProps) {
  return (
    <ModalPortal>
      <FadeModalScaffold
        open={open}
        onClose={onClose}
        zIndex={220}
        overlayClassName={cn('bg-black/20 backdrop-blur-sm', INVENTORY_MODAL_Z_CLASS)}
        layoutClassName="items-end justify-center md:items-center p-0 md:p-4"
        panelClassName="w-full max-w-lg"
        aria-label={title}
      >
        <div className="flex max-h-[min(80svh,32rem)] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-card md:rounded-3xl">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="text-[15px] font-normal text-foreground">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิด"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted/50"
            >
              <X size={16} />
            </button>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-[13px] text-muted-foreground">{emptyMessage}</li>
            ) : (
              items.map((item) => (
                <li
                  key={item.id}
                  className="border-b border-border px-4 py-3 last:border-b-0"
                >
                  <p className="text-[14px] text-foreground">{item.primary}</p>
                  {item.secondary ? (
                    <p className="mt-0.5 text-[12px] text-muted-foreground">{item.secondary}</p>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>
      </FadeModalScaffold>
    </ModalPortal>
  );
}
