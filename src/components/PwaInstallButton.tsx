'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Download, Share, SquarePlus } from '@/lib/icons';
import { CloseIcon } from '@/components/ui/close-icon';
import { LoadingIcon } from '@/components/ui/loading-icon';
import { PWA_DISPLAY_NAME } from '@/lib/pwa-config';
import { prepareFreshPwaInstall } from '@/lib/pwa-install-reset';
import {
  shouldResetStorageAfterAcceptedInstall,
  shouldShowPreparingState,
} from '@/lib/pwa-install-flow';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { useMobileBackLayer } from '@/hooks/use-mobile-back-layer';
import type { PwaInstallMode } from '@/lib/pwa-install';
import { cn } from '@/lib/utils';
import { BB_BTN_CLOSE, BB_BTN_OUTLINE_PRIMARY } from '@/lib/ui-outlined-tokens';
import {
  SETTINGS_ROW_TRIGGER,
  SETTINGS_SECTION,
  SettingsIconBadge,
} from '@/app/[locale]/settings/_components/settings-ui-primitives';

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
  variant?: 'floating' | 'settings';
  /** Limit where the affordance appears (e.g. iOS guide on login, Chromium install in settings). */
  modeFilter?: PwaInstallMode;
};

export function PwaInstallButton({
  locale = 'th',
  className = '',
  variant = 'floating',
  modeFilter,
}: PwaInstallButtonProps) {
  const t = COPY[locale];
  const { visible, mode, promptInstall } = usePwaInstall();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);
  const portalTarget = useSyncExternalStore(
    () => () => {},
    () => document.body,
    () => null,
  );

  const closeIosGuide = useCallback(() => {
    dialogRef.current?.close();
    setIosGuideOpen(false);
  }, []);

  const openIosGuide = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    setIosGuideOpen(true);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onClose = () => setIosGuideOpen(false);
    const onCancel = () => dialog.close();
    dialog.addEventListener('close', onClose);
    dialog.addEventListener('cancel', onCancel);
    return () => {
      dialog.removeEventListener('close', onClose);
      dialog.removeEventListener('cancel', onCancel);
    };
  }, []);

  useMobileBackLayer('pwa-install-overlay', iosGuideOpen, closeIosGuide);

  if (!visible || (modeFilter != null && mode !== modeFilter)) return null;

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

  const installButtonClass =
    variant === 'settings'
      ? cn(SETTINGS_ROW_TRIGGER, showPreparing && 'opacity-70')
      : 'pointer-events-auto inline-flex items-center gap-1.5 rounded-2xl border border-border/80 bg-card/80 px-3.5 py-2 text-xs font-normal text-muted-foreground backdrop-blur-sm transition-colors hover:border-foreground/20 hover:text-foreground disabled:opacity-70';

  const installLabel = showPreparing ? t.preparing : t.install;

  const installTrigger = (
    <button
      type="button"
      onClick={() => void handleInstall()}
      disabled={showPreparing}
      className={installButtonClass}
      aria-busy={showPreparing}
      aria-label={installLabel}
    >
      {variant === 'settings' ? (
        <>
          <SettingsIconBadge className="shrink-0">
            {showPreparing ? (
              <LoadingIcon size="sm" strokeWidth={1.75} />
            ) : (
              <Download size={18} strokeWidth={1.75} aria-hidden />
            )}
          </SettingsIconBadge>
          <span className="flex-1 min-w-0 text-[14px] text-foreground leading-snug">
            {installLabel}
          </span>
        </>
      ) : (
        <>
          {showPreparing ? (
            <LoadingIcon size="sm" strokeWidth={1.5} />
          ) : (
            <Download size={14} strokeWidth={1.5} aria-hidden />
          )}
          {installLabel}
        </>
      )}
    </button>
  );

  const iosGuideDialog = (
    <dialog
      ref={dialogRef}
      className="bb-modal-panel m-auto w-[min(100%-2rem,22rem)] max-w-sm rounded-2xl border border-border bg-card p-0 text-foreground shadow-lg backdrop:bg-foreground/20 motion-reduce:open:animate-none"
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
            className={cn(BB_BTN_CLOSE, 'inline-flex h-8 w-8 shrink-0')}
            aria-label={t.close}
          >
            <CloseIcon size="sm" strokeWidth={1.5} />
          </button>
        </div>

        <ol className="space-y-3 text-sm font-normal">
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-xs tabular-nums">
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
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-xs tabular-nums">
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
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-xs tabular-nums">
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
          className={cn(BB_BTN_OUTLINE_PRIMARY, 'w-full py-2.5 text-sm font-normal')}
        >
          {t.close}
        </button>
      </div>
    </dialog>
  );

  const portaledDialog =
    portalTarget != null ? createPortal(iosGuideDialog, portalTarget) : iosGuideDialog;

  if (variant === 'settings') {
    return (
      <>
        <section className={cn(SETTINGS_SECTION, className)}>{installTrigger}</section>
        {portaledDialog}
      </>
    );
  }

  return (
    <>
      <div className={className}>{installTrigger}</div>
      {portaledDialog}
    </>
  );
}
