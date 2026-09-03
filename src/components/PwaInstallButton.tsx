'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Loader2, Share, SquarePlus, X } from '@/lib/icons';
import { PWA_DISPLAY_NAME } from '@/lib/pwa-config';
import { prepareFreshPwaInstall } from '@/lib/pwa-install-reset';
import {
  shouldResetStorageAfterAcceptedInstall,
  shouldShowPreparingState,
} from '@/lib/pwa-install-flow';
import { usePwaInstall } from '@/hooks/use-pwa-install';

const COPY = {
  th: {
    install: 'ติดตั้งแอป',
    preparing: 'กำลังเตรียมติดตั้งใหม่…',
    iosTitle: `ติดตั้ง ${PWA_DISPLAY_NAME}`,
    iosStep1: 'แตะปุ่ม แชร์',
    iosStep1Hint: 'ที่แถบด้านล่างของ Safari',
    iosStep2: 'เลือก เพิ่มไปที่หน้าจอโฮม',
    iosStep2Hint: 'จากเมนูที่เปิดขึ้น',
    iosStep3: 'แตะ เพิ่ม',
    iosStep3Hint: 'มุมขวาบนของหน้าต่าง',
    close: 'ปิด',
  },
  en: {
    install: 'Install app',
    preparing: 'Preparing fresh install…',
    iosTitle: `Install ${PWA_DISPLAY_NAME}`,
    iosStep1: 'Tap Share',
    iosStep1Hint: 'In the Safari toolbar at the bottom',
    iosStep2: 'Choose Add to Home Screen',
    iosStep2Hint: 'From the menu that opens',
    iosStep3: 'Tap Add',
    iosStep3Hint: 'Top-right of the sheet',
    close: 'Close',
  },
} as const;

type PwaInstallButtonProps = {
  locale?: 'th' | 'en';
  className?: string;
};

export function PwaInstallButton({ locale = 'th', className = '' }: PwaInstallButtonProps) {
  const t = COPY[locale];
  const { visible, mode, promptInstall } = usePwaInstall();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  const openIosGuide = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
  }, []);

  const closeIosGuide = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onCancel = () => dialog.close();
    dialog.addEventListener('cancel', onCancel);
    return () => dialog.removeEventListener('cancel', onCancel);
  }, []);

  if (!visible) return null;

  const handleInstall = async () => {
    if (isPreparing) return;

    if (mode === 'ios-manual') {
      openIosGuide();
      return;
    }

    if (mode !== 'native') return;

    setIsPreparing(true);
    try {
      const outcome = await promptInstall();
      if (outcome === 'accepted' && shouldResetStorageAfterAcceptedInstall(mode)) {
        void prepareFreshPwaInstall().catch(() => {
          // Non-fatal install already succeeded
        });
      }
    } finally {
      setIsPreparing(false);
    }
  };

  const showPreparing = isPreparing && shouldShowPreparingState(mode);

  return (
    <>
      <div className={className}>
        <button
          type="button"
          onClick={() => void handleInstall()}
          disabled={showPreparing}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/80 px-3.5 py-2 text-xs font-normal text-muted-foreground backdrop-blur-sm transition-colors hover:border-foreground/20 hover:text-foreground disabled:opacity-70"
          aria-busy={showPreparing}
          aria-label={showPreparing ? t.preparing : t.install}
        >
          {showPreparing ? (
            <Loader2 size={14} strokeWidth={1.5} className="animate-spin" aria-hidden />
          ) : (
            <Download size={14} strokeWidth={1.5} aria-hidden />
          )}
          {showPreparing ? t.preparing : t.install}
        </button>
      </div>

      <dialog
        ref={dialogRef}
        className="m-auto w-[min(100%-2rem,22rem)] max-w-sm rounded-3xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-foreground/20 open:animate-in open:fade-in-0"
        aria-labelledby="pwa-ios-install-title"
      >
        <div className="flex flex-col gap-5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 id="pwa-ios-install-title" className="text-base font-normal tracking-wide">
                {t.iosTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeIosGuide}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={t.close}
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          <ol className="space-y-3 text-sm font-normal">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs tabular-nums">
                1
              </span>
              <span className="pt-0.5">
                <span className="inline-flex items-center gap-1 text-foreground">
                  <Share size={14} strokeWidth={1.5} aria-hidden />
                  {t.iosStep1}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{t.iosStep1Hint}</span>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs tabular-nums">
                2
              </span>
              <span className="pt-0.5">
                <span className="inline-flex items-center gap-1 text-foreground">
                  <SquarePlus size={14} strokeWidth={1.5} aria-hidden />
                  {t.iosStep2}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{t.iosStep2Hint}</span>
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs tabular-nums">
                3
              </span>
              <span className="pt-0.5">
                <span className="text-foreground">{t.iosStep3}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{t.iosStep3Hint}</span>
              </span>
            </li>
          </ol>

          <button
            type="button"
            onClick={closeIosGuide}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-foreground px-4 py-2.5 text-sm font-normal text-background"
          >
            {t.close}
          </button>
        </div>
      </dialog>
    </>
  );
}
