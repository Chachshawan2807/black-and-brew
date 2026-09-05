'use client';

import { useEffect, type ReactNode } from 'react';
import { CloseIcon } from '@/components/ui/close-icon';
import { FadeModalScaffold } from '@/components/ui/fade-modal-scaffold';
import { ModalPortal } from '@/components/ui/modal-portal';
import { INVENTORY_MODAL_Z_CLASS } from '@/lib/floating-action-layout';
import { isSidebarMenuLabel } from '@/lib/sidebar-menu-labels';
import type { SecretaryAttentionListItem } from '@/lib/secretary/task-detail-overlay';
import { cn } from '@/lib/utils';
import {
  SECRETARY_MODAL_LAYOUT_CLASS,
  SECRETARY_MODAL_OVERLAY_CLASS,
  SECRETARY_MODAL_SCAFFOLD_PROPS,
  SECRETARY_PANEL_MAX_HEIGHT,
} from './secretary-modal-layout';

type SecretaryTaskPanelShellProps = {
  open?: boolean;
  title: string;
  subtitle?: string;
  ariaLabel?: string;
  onClose: () => void;
  closeDisabled?: boolean;
  /** Tailwind max-width utility, e.g. max-w-3xl */
  maxWidthClass?: string;
  zIndex?: number;
  footer?: ReactNode;
  /** When false, body does not scroll (child manages scroll). Default true. */
  bodyScroll?: boolean;
  children: ReactNode;
};

/** Shared secretary task panel chrome: backdrop, header, body, optional footer. */
export default function SecretaryTaskPanelShell({
  open = true,
  title,
  subtitle,
  ariaLabel,
  onClose,
  closeDisabled = false,
  maxWidthClass = 'max-w-3xl',
  zIndex = 220,
  footer,
  bodyScroll = true,
  children,
}: SecretaryTaskPanelShellProps) {
  const showTitle = !isSidebarMenuLabel(title);
  const hasVisibleHeader = showTitle || Boolean(subtitle);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <ModalPortal>
      <FadeModalScaffold
        open={open}
        onClose={closeDisabled ? undefined : onClose}
        zIndex={zIndex}
        {...SECRETARY_MODAL_SCAFFOLD_PROPS}
        overlayClassName={cn(SECRETARY_MODAL_OVERLAY_CLASS, INVENTORY_MODAL_Z_CLASS)}
        layoutClassName={SECRETARY_MODAL_LAYOUT_CLASS}
        panelClassName={cn(
          'flex w-full min-h-0 flex-col overflow-hidden',
          SECRETARY_PANEL_MAX_HEIGHT,
          maxWidthClass,
        )}
        aria-label={ariaLabel ?? title}
      >
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {hasVisibleHeader ? (
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3.5">
              <div className="min-w-0 flex-1 pt-0.5">
                {showTitle ? (
                  <h2 className="truncate text-base font-normal tracking-tight text-foreground">
                    {title}
                  </h2>
                ) : null}
                {subtitle ? (
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground text-balance">
                    {subtitle}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={closeDisabled}
                aria-label="ปิด"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 disabled:opacity-50"
              >
                <CloseIcon size="sm" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onClose}
              disabled={closeDisabled}
              aria-label="ปิด"
              className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 disabled:opacity-50"
            >
              <CloseIcon size="sm" />
            </button>
          )}

          <div
            className={cn(
              'flex min-h-0 flex-1 flex-col px-4',
              hasVisibleHeader ? 'pt-3' : 'pt-0',
              footer
                ? 'pb-3'
                : 'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
              bodyScroll
                ? 'overflow-y-auto overscroll-contain bb-smooth-scroll [scrollbar-width:thin]'
                : 'overflow-hidden',
            )}
          >
            {children}
          </div>

          {footer ? (
            <div className="flex shrink-0 flex-col gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          ) : null}
        </div>
      </FadeModalScaffold>
    </ModalPortal>
  );
}

/** Card-style detail row for read-only secretary list/info overlays. */
export function SecretaryTaskDetailRow({ item }: { item: SecretaryAttentionListItem }) {
  return (
    <>
      <p className="text-[14px] leading-snug text-foreground">{item.primary}</p>
      {item.secondary ? (
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{item.secondary}</p>
      ) : null}
    </>
  );
}
