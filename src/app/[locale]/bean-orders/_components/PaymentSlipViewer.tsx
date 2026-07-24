'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, X, ZoomIn } from 'lucide-react';
import { getBeanOrderSlipSignedUrl } from '@/app/actions/bean-order-actions';
import {
  BEAN_ORDER_ACTION_BTN_OUTLINE,
  BEAN_ORDER_BTN_ICON,
  BEAN_ORDER_BTN_SLIP,
  BEAN_ORDER_BTN_SLIP_PANEL,
} from './bean-order-layout';

type Props = {
  orderId?: string;
  slipUrl?: string | null;
  /** Local blob/object URL for a slip selected but not yet saved */
  previewUrl?: string | null;
  uploadedAt?: string | null;
  variant?: 'compact' | 'panel';
};

const DIALOG_CLASS =
  'fixed left-1/2 top-1/2 z-50 m-0 flex w-fit max-w-[min(92vw,360px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-black/50 sm:max-w-[380px]';

const SLIP_IMAGE_CLASS =
  'max-h-[min(58dvh,420px)] w-auto max-w-[min(86vw,320px)] object-contain sm:max-h-[min(62dvh,460px)] sm:max-w-[340px] md:max-h-[440px] md:max-w-[320px]';

const PANEL_PREVIEW_IMAGE_CLASS =
  'max-h-[6.5rem] max-w-full w-auto object-contain transition group-hover:opacity-90';

export function PaymentSlipViewer({
  orderId,
  slipUrl: initialSlipUrl,
  previewUrl,
  uploadedAt,
  variant = 'compact',
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [slipUrl, setSlipUrl] = useState(initialSlipUrl ?? null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedPreviewUrl = previewUrl ?? slipUrl;

  useEffect(() => {
    setSlipUrl(initialSlipUrl ?? null);
  }, [initialSlipUrl]);

  useEffect(() => {
    if (previewUrl || slipUrl || !uploadedAt || !orderId) return;
    void loadSlipUrl('preview');
  }, [orderId, uploadedAt, slipUrl, previewUrl]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (expanded && !dialog.open) dialog.showModal();
    if (!expanded && dialog.open) dialog.close();
  }, [expanded]);

  async function loadSlipUrl(mode: 'preview' | 'modal') {
    if (!orderId) return;

    const setLoading = mode === 'preview' ? setPreviewLoading : setModalLoading;
    setLoading(true);
    if (mode === 'modal') setError(null);

    const result = await getBeanOrderSlipSignedUrl(orderId);
    setLoading(false);

    if (!result.success) {
      if (mode === 'modal') setError(result.error ?? 'โหลดสลิปไม่สำเร็จ');
      return;
    }
    if (!result.slipUrl) {
      if (mode === 'modal') setError('ไม่พบไฟล์สลิป');
      return;
    }
    setSlipUrl(result.slipUrl);
  }

  async function handleExpand() {
    setExpanded(true);
    if (previewUrl || slipUrl) return;
    if (orderId) {
      await loadSlipUrl('modal');
    }
  }

  function handleClose() {
    setExpanded(false);
    setError(null);
  }

  function formatUploadedAt(value: string): string {
    return new Date(value).toLocaleString('th-TH', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const isPanel = variant === 'panel';
  const slipButtonClass = isPanel ? BEAN_ORDER_BTN_SLIP_PANEL : BEAN_ORDER_BTN_SLIP;
  const previewImageClass = isPanel
    ? PANEL_PREVIEW_IMAGE_CLASS
    : 'block max-h-40 w-auto max-w-[10rem] object-contain object-left transition group-hover:opacity-90 sm:max-h-48 sm:max-w-[11rem]';
  const modalImageUrl = previewUrl ?? slipUrl;

  return (
    <>
      <button
        type="button"
        onClick={() => void handleExpand()}
        className={slipButtonClass}
        aria-label="ขยายดูสลิปชำระเงิน"
      >
        <div
          className={
            isPanel
              ? 'flex h-full min-h-0 flex-1 flex-col'
              : 'inline-flex w-fit max-w-full flex-col'
          }
        >
          {previewLoading ? (
            <div
              className={
                isPanel
                  ? 'flex min-h-0 flex-1 items-center justify-center px-3 py-4 text-sm text-muted-foreground'
                  : 'flex min-h-24 min-w-[7rem] items-center justify-center px-3 py-4 text-sm text-muted-foreground'
              }
            >
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              กำลังโหลด...
            </div>
          ) : resolvedPreviewUrl ? (
            <div
              className={
                isPanel
                  ? 'flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2 sm:p-3'
                  : undefined
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolvedPreviewUrl}
                alt="สลิปชำระเงิน"
                className={previewImageClass}
                onError={() => {
                  if (!previewUrl && orderId) {
                    void loadSlipUrl('preview');
                  }
                }}
              />
            </div>
          ) : (
            <div
              className={
                isPanel
                  ? 'flex min-h-0 flex-1 items-center justify-center px-3 py-4 text-sm text-muted-foreground'
                  : 'flex min-h-24 min-w-[7rem] items-center justify-center px-3 py-4 text-sm text-muted-foreground'
              }
            >
              กดเพื่อดูสลิป
            </div>
          )}
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-2 py-1.5 text-xs text-muted-foreground">
            <ZoomIn className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {previewUrl ? (
              <span className="whitespace-nowrap">กดเพื่อขยาย</span>
            ) : uploadedAt ? (
              <span className="tabular-nums whitespace-nowrap">{formatUploadedAt(uploadedAt)}</span>
            ) : null}
          </div>
        </div>
      </button>

      {expanded ? (
        <dialog
          ref={dialogRef}
          className={DIALOG_CLASS}
          closedby="any"
          onClose={handleClose}
          onCancel={handleClose}
        >
          <div
            className="flex items-center justify-between gap-3 border-b border-border px-4 py-3"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-sm text-foreground">สลิปชำระเงิน</h3>
            <button
              type="button"
              onClick={handleClose}
              className={`h-9 w-9 text-muted-foreground ${BEAN_ORDER_BTN_ICON}`}
              aria-label="ปิด"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div
            className="flex min-h-0 flex-col items-center justify-center overflow-auto p-4"
            onClick={handleClose}
            role="presentation"
          >
            {modalLoading ? (
              <div
                className="flex items-center gap-2 text-sm text-muted-foreground"
                onClick={(event) => event.stopPropagation()}
              >
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                กำลังโหลดสลิป...
              </div>
            ) : error ? (
              <div
                className="space-y-3 text-center"
                onClick={(event) => event.stopPropagation()}
              >
                <p className="text-sm text-red-600">{error}</p>
                {orderId ? (
                  <button
                    type="button"
                    onClick={() => void loadSlipUrl('modal')}
                    className={BEAN_ORDER_ACTION_BTN_OUTLINE}
                  >
                    ลองใหม่
                  </button>
                ) : null}
              </div>
            ) : modalImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={modalImageUrl}
                alt="สลิปชำระเงิน"
                className={SLIP_IMAGE_CLASS}
                onClick={(event) => event.stopPropagation()}
                onError={() => {
                  if (!previewUrl && orderId) {
                    void loadSlipUrl('modal');
                  }
                }}
              />
            ) : (
              <p
                className="text-sm text-muted-foreground"
                onClick={(event) => event.stopPropagation()}
              >
                ไม่พบไฟล์สลิป
              </p>
            )}
          </div>
        </dialog>
      ) : null}
    </>
  );
}
