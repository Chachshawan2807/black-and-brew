'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getBeanOrderSlipSignedUrl } from '@/app/actions/bean-order-actions';

type Props = {
  orderId: string;
  slipUrl: string | null;
  uploadedAt?: string | null;
};

const DIALOG_CLASS =
  'fixed left-1/2 top-1/2 z-50 flex max-h-[min(92dvh,900px)] w-[min(560px,94vw)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-black/50';

export function PaymentSlipViewer({ orderId, slipUrl: initialSlipUrl, uploadedAt }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [slipUrl, setSlipUrl] = useState(initialSlipUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSlipUrl(initialSlipUrl);
  }, [initialSlipUrl]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function refreshSlipUrl() {
    setLoading(true);
    setError(null);
    const result = await getBeanOrderSlipSignedUrl(orderId);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? 'โหลดสลิปไม่สำเร็จ');
      return;
    }
    if (!result.slipUrl) {
      setError('ไม่พบไฟล์สลิป');
      return;
    }
    setSlipUrl(result.slipUrl);
  }

  async function handleOpen() {
    setOpen(true);
    if (!slipUrl) {
      await refreshSlipUrl();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleOpen()}
        className="group block w-full max-w-sm overflow-hidden rounded-xl border border-border bg-muted/20 text-left"
      >
        {slipUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={slipUrl}
            alt="สลิปชำระเงิน"
            className="max-h-48 w-full object-contain transition group-hover:opacity-90"
            onError={() => {
              void refreshSlipUrl();
            }}
          />
        ) : (
          <div className="flex min-h-24 items-center justify-center px-4 py-6 text-sm text-muted-foreground">
            กดเพื่อดูสลิป
          </div>
        )}
        <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          กดเพื่อขยายดูสลิป
          {uploadedAt ? (
            <span className="tabular-nums">
              {' '}
              / อัปโหลด{' '}
              {new Date(uploadedAt).toLocaleString('th-TH', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          ) : null}
        </div>
      </button>

      <dialog
        ref={dialogRef}
        className={DIALOG_CLASS}
        onClose={() => setOpen(false)}
        onCancel={(event) => {
          event.preventDefault();
          setOpen(false);
        }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h3 className="text-sm text-foreground">สลิปชำระเงิน</h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-9 items-center rounded-full px-3 text-sm text-muted-foreground hover:bg-muted/40"
          >
            ปิด
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto p-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              กำลังโหลดสลิป...
            </div>
          ) : error ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={() => void refreshSlipUrl()}
                className="inline-flex h-10 items-center rounded-full border border-border px-4 text-sm"
              >
                ลองใหม่
              </button>
            </div>
          ) : slipUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slipUrl}
              alt="สลิปชำระเงิน"
              className="max-h-[min(72dvh,760px)] w-auto max-w-full object-contain"
              onError={() => {
                void refreshSlipUrl();
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">ไม่พบไฟล์สลิป</p>
          )}
        </div>
      </dialog>
    </>
  );
}
