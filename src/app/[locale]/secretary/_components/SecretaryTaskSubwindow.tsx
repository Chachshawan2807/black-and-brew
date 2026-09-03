'use client';

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { FadeModalScaffold } from '@/components/ui/fade-modal-scaffold';
import { ModalPortal } from '@/components/ui/modal-portal';
import { INVENTORY_MODAL_Z_CLASS } from '@/lib/floating-action-layout';
import { cn } from '@/lib/utils';
import { SECRETARY_MODAL_LAYOUT_CLASS, SECRETARY_MODAL_SCAFFOLD_PROPS } from './secretary-modal-layout';

type SecretaryTaskSubwindowProps = {
  title: string;
  ariaLabel?: string;
  onClose: () => void;
  children: ReactNode;
  /** Tailwind max-width utility, e.g. max-w-3xl */
  maxWidthClass?: string;
  zIndex?: number;
};

/** Shared secretary task sub-window: backdrop + top-right close, compact real-page embed. */
export default function SecretaryTaskSubwindow({
  title,
  ariaLabel,
  onClose,
  children,
  maxWidthClass = 'max-w-3xl',
  zIndex = 220,
}: SecretaryTaskSubwindowProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <ModalPortal>
      <FadeModalScaffold
        open
        onClose={onClose}
        zIndex={zIndex}
        {...SECRETARY_MODAL_SCAFFOLD_PROPS}
        overlayClassName={cn('bg-black/20 backdrop-blur-md', INVENTORY_MODAL_Z_CLASS)}
        layoutClassName={SECRETARY_MODAL_LAYOUT_CLASS}
        panelClassName={cn(
          'flex w-full min-h-0 max-h-[min(85svh,calc(100dvh-2rem))] flex-col overflow-hidden',
          maxWidthClass,
        )}
        aria-label={ariaLabel ?? title}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-border bg-background">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="min-w-0 truncate text-[15px] font-normal text-foreground">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิด"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted/50"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            {children}
          </div>
        </div>
      </FadeModalScaffold>
    </ModalPortal>
  );
}
