'use client';

import { useCallback, useEffect, useState } from 'react';
import { ZoomIn } from '@/lib/icons';
import { getBeanOrderSlipSignedUrl } from '@/app/actions/bean-order-actions';
import {
  BEAN_ORDER_ACTION_BTN_OUTLINE,
  BEAN_ORDER_BTN_SLIP,
  BEAN_ORDER_BTN_SLIP_PANEL,
} from './bean-order-layout';
import {
  BeanOrderDialogShell,
  BeanOrderInlineLoading,
  BeanOrderModalCloseButton,
} from './bean-order-ui-primitives';

type Props = {
  orderId?: string;
  slipUrl?: string | null;
  /** Local blob/object URL for a slip selected but not yet saved */
  previewUrl?: string | null;
  uploadedAt?: string | null;
  variant?: 'compact' | 'panel';
  /** Detail page: show slip near full size, centered on screen */
  largeModal?: boolean;
};

const SLIP_IMAGE_CLASS =
  'max-h-[min(58dvh,420px)] w-auto max-w-[min(86vw,320px)] object-contain sm:max-h-[min(62dvh,460px)] sm:max-w-[340px] md:max-h-[440px] md:max-w-[320px]';

export const SLIP_MODAL_PANEL_CLASS =
  'w-fit max-w-[min(92vw,360px)] sm:max-w-[380px]';

export const SLIP_MODAL_PANEL_CLASS_LARGE =
  'w-fit max-w-[min(calc(100vw-2rem),520px)] max-h-[calc(100dvh-2rem)]';

export const SLIP_MODAL_BODY_CLASS_LARGE =
  'flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden p-0';

export const SLIP_MODAL_LAYOUT_CLASS_LARGE =
  'items-center justify-center p-3 sm:p-4';

/** Fits within viewport padding and close button without scrolling */
export const SLIP_IMAGE_CLASS_LARGE =
  'block h-auto w-auto max-h-[calc(100dvh-4rem)] max-w-[min(calc(100vw-2rem),520px)] object-contain';

const PANEL_PREVIEW_IMAGE_CLASS =
  'max-h-[6.5rem] max-w-full w-auto object-contain transition group-hover:opacity-90';

export function PaymentSlipViewer({
  orderId,
  slipUrl: initialSlipUrl,
  previewUrl,
  uploadedAt,
  variant = 'compact',
  largeModal = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [slipUrl, setSlipUrl] = useState(initialSlipUrl ?? null);
  const [prevInitialSlipUrl, setPrevInitialSlipUrl] = useState(initialSlipUrl);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedPreviewUrl = previewUrl ?? slipUrl;

  if (initialSlipUrl !== prevInitialSlipUrl) {
    setPrevInitialSlipUrl(initialSlipUrl);
    setSlipUrl(initialSlipUrl ?? null);
  }

  const loadSlipUrl = useCallback(async (mode: 'preview' | 'modal') => {
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
  }, [orderId]);

  useEffect(() => {
    if (previewUrl || slipUrl || !uploadedAt || !orderId) return;
    queueMicrotask(() => {
      void loadSlipUrl('preview');
    });
  }, [orderId, uploadedAt, slipUrl, previewUrl, loadSlipUrl]);

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
                  ? 'flex min-h-0 flex-1 items-center justify-center px-3 py-4'
                  : 'flex min-h-24 min-w-[7rem] items-center justify-center px-3 py-4'
              }
            >
              <BeanOrderInlineLoading label="กำลังโหลด..." />
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

      <BeanOrderDialogShell
        open={expanded}
        onClose={handleClose}
        panelClassName={largeModal ? SLIP_MODAL_PANEL_CLASS_LARGE : SLIP_MODAL_PANEL_CLASS}
        centerScrollable={!largeModal}
        layoutClassName={largeModal ? SLIP_MODAL_LAYOUT_CLASS_LARGE : undefined}
        aria-label="สลิปชำระเงิน"
      >
        <BeanOrderModalCloseButton onClose={handleClose} />
        <div
          className={
            largeModal
              ? SLIP_MODAL_BODY_CLASS_LARGE
              : 'flex min-h-0 flex-col items-center justify-center overflow-auto p-4'
          }
        >
          {modalLoading ? (
            <BeanOrderInlineLoading label="กำลังโหลดสลิป..." />
          ) : error ? (
            <div className="space-y-3 text-center">
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
              className={largeModal ? SLIP_IMAGE_CLASS_LARGE : SLIP_IMAGE_CLASS}
              onError={() => {
                if (!previewUrl && orderId) {
                  void loadSlipUrl('modal');
                }
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">ไม่พบไฟล์สลิป</p>
          )}
        </div>
      </BeanOrderDialogShell>
    </>
  );
}
