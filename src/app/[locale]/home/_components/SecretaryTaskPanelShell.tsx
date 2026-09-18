'use client';

import { useEffect, type ReactNode } from 'react';
import { CloseIcon } from '@/components/ui/close-icon';
import { FadeModalScaffold } from '@/components/ui/fade-modal-scaffold';
import { ModalPortal } from '@/components/ui/modal-portal';
import { INVENTORY_MODAL_Z_CLASS } from '@/lib/floating-action-layout';
import type { SecretaryAttentionListItem } from '@/lib/secretary/task-detail-overlay';
import { cn } from '@/lib/utils';
import { BB_BTN_CLOSE } from '@/lib/ui-outlined-tokens';
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
  /** Shrink panel width to header/body content (short schedule card grids). */
  fitContent?: boolean;
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
  fitContent = false,
  children,
}: SecretaryTaskPanelShellProps) {
  const showTitle = Boolean(title.trim());
  const hasVisibleHeader = showTitle || Boolean(subtitle);
  const titleOnlyHeader = showTitle && !subtitle;

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
          'flex min-h-0 flex-col overflow-hidden',
          fitContent
            ? 'w-fit min-w-[min(100%,18rem)] max-w-[min(calc(100dvw-2rem),calc(100vw-env(safe-area-inset-left)-env(safe-area-inset-right)-2rem))]'
            : 'w-full',
          SECRETARY_PANEL_MAX_HEIGHT,
          !fitContent && maxWidthClass,
        )}
        aria-label={ariaLabel ?? title}
      >
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {hasVisibleHeader ? (
            <div
              className={cn(
                'flex shrink-0 justify-between gap-3 border-b border-border px-4 py-3.5',
                titleOnlyHeader ? 'items-center' : 'items-start',
              )}
            >
              <div className="min-w-0 flex-1">
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
                className={BB_BTN_CLOSE}
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
              className={cn(BB_BTN_CLOSE, 'absolute right-3 top-3 z-10 shrink-0')}
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
                ? 'overflow-y-auto overscroll-contain bb-smooth-scroll'
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

/** Card-style detail row for read-only secretary list overlays. */
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

/** Compact table for read-only text-only secretary task info overlays. */
export function SecretaryTaskDetailTable({ items }: { items: SecretaryAttentionListItem[] }) {
  const hasSecondary = items.some((item) => Boolean(item.secondary?.trim()));

  return (
    <div className="overflow-x-auto pb-1">
      <table className="w-full min-w-0 border-collapse text-[13px]">
        {hasSecondary ? (
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th scope="col" className="px-3 py-2 text-left font-normal">รายการ</th>
              <th scope="col" className="px-3 py-2 text-left font-normal">รายละเอียด</th>
            </tr>
          </thead>
        ) : null}
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border last:border-b-0">
              <td
                className={cn(
                  'px-3 py-2.5 align-top text-foreground',
                  !hasSecondary && 'text-[14px] leading-snug',
                )}
              >
                {item.primary}
              </td>
              {hasSecondary ? (
                <td className="px-3 py-2.5 align-top text-muted-foreground">
                  {item.secondary ?? ''}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
