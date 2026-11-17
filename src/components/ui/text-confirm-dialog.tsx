'use client';

import { cn } from '@/lib/utils';
import { FadeModalScaffold } from '@/components/ui/fade-modal-scaffold';
import { LoadingIcon } from '@/components/ui/loading-icon';
import { ModalPortal } from '@/components/ui/modal-portal';
import { bbPastelClass } from '@/lib/ui-outlined-tokens';

type TextConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  zIndex?: number;
  /** Keep dialog centered in the visible viewport (scroll + mobile keyboard). */
  viewportCentered?: boolean;
  /** Render through document.body so position is not clipped by page layout. */
  portaled?: boolean;
  /** Filled pastel-blue confirm (bean-order deliver, etc.). */
  confirmAccent?: 'default' | 'info-pastel-blue';
};

export function TextConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  destructive = false,
  busy = false,
  onConfirm,
  onClose,
  zIndex,
  viewportCentered = false,
  portaled = false,
  confirmAccent = 'default',
}: TextConfirmDialogProps) {
  const confirmClassName = destructive
    ? 'bg-destructive text-destructive-foreground hover:opacity-90'
    : confirmAccent === 'info-pastel-blue'
      ? cn(
          'border-0 shadow-sm hover:opacity-90',
          bbPastelClass('bg-[#cce5ff]'),
          'text-black',
        )
      : 'border-0 bg-primary text-primary-foreground hover:opacity-90';

  const scaffold = (
    <FadeModalScaffold
      open={open}
      onClose={busy ? undefined : onClose}
      zIndex={zIndex}
      aria-label={title}
      centerScrollable={viewportCentered}
      keyboardAware={viewportCentered}
      layoutClassName={
        viewportCentered
          ? 'min-h-full min-w-full items-center justify-center p-4'
          : undefined
      }
      panelClassName="w-full max-w-sm rounded-3xl border border-border bg-card p-5 shadow-lg"
    >
      <h3 className="text-base font-normal text-foreground">{title}</h3>
      {description ? (
        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl border-0 bg-muted/30 px-4 text-sm text-foreground hover:bg-muted/45 disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          aria-busy={busy}
          className={cn(
            'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl px-4 text-sm disabled:opacity-50',
            confirmClassName,
          )}
        >
          {busy ? (
            <>
              <LoadingIcon size="sm" />
              กำลังดำเนินการ…
            </>
          ) : (
            confirmLabel
          )}
        </button>
      </div>
    </FadeModalScaffold>
  );

  if (portaled) {
    return <ModalPortal>{scaffold}</ModalPortal>;
  }

  return scaffold;
}