'use client';

import { LoadingIcon } from '@/components/ui/loading-icon';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Lock } from '@/lib/icons';
import { verifyPin } from '@/app/actions/auth';
import { setClientAuthSession } from '@/lib/client-auth-storage';
import { collectClientDeviceInfo } from '@/lib/client-device-info';
import { cn } from '@/lib/utils';

const PIN_LENGTH = 6;

type CountAdjustPinDialogProps = {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
};

export function CountAdjustPinDialog({
  open,
  onCancel,
  onSuccess,
}: CountAdjustPinDialogProps) {
  const isMounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setPin('');
      setError(null);
      setIsVerifying(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => {
      hiddenInputRef.current?.focus({ preventScroll: true });
    }, 80);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const handlePinInput = useCallback(
    async (value: string) => {
      if (isVerifying) return;

      const nextPin = value.replace(/\D/g, '').slice(0, PIN_LENGTH);
      setPin(nextPin);
      setError(null);

      if (nextPin.length < PIN_LENGTH) return;

      setIsVerifying(true);
      hiddenInputRef.current?.blur();

      try {
        const device = collectClientDeviceInfo();
        const res = await verifyPin(nextPin, device);

        if (!res.success) {
          setError(res.error ?? 'รหัส PIN ไม่ถูกต้อง');
          window.setTimeout(() => {
            setPin('');
            hiddenInputRef.current?.focus({ preventScroll: true });
          }, 400);
          return;
        }

        if (res.isReadOnly) {
          setError('ต้องใช้รหัสสิทธิ์แก้ไข (ไม่ใช่รหัสดูอย่างเดียว)');
          window.setTimeout(() => {
            setPin('');
            hiddenInputRef.current?.focus({ preventScroll: true });
          }, 400);
          return;
        }

        setClientAuthSession(false, res.offlineAuthSessionId);
        onSuccess();
      } finally {
        setIsVerifying(false);
      }
    },
    [isVerifying, onSuccess],
  );

  if (!open || !isMounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[225] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="count-adjust-pin-title"
        className="w-[min(360px,92vw)] overflow-hidden rounded-2xl border border-border bg-card text-foreground bb-shadow-xl pb-[env(safe-area-inset-bottom)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-5 flex flex-col items-center gap-5 text-center">
          <div className="w-14 h-14 border-2 border-foreground/85 bg-card text-foreground rounded-2xl flex items-center justify-center bb-shadow-md">
            {isVerifying ? (
              <LoadingIcon size="lg" className="aria-hidden" />
            ) : (
              <Lock className="h-6 w-6" strokeWidth={1.5} aria-hidden />
            )}
          </div>

          <div className="space-y-1">
            <h3 id="count-adjust-pin-title" className="text-base font-normal text-foreground">
              ยืนยันสิทธิ์แก้ไข
            </h3>
            <p className="text-sm text-muted-foreground">
              กรอกรหัส PIN สิทธิ์แก้ไข 6 หลักเพื่อเข้าแท็บปรับจำนวน
            </p>
          </div>

          <div className="relative w-full max-w-[280px] min-h-14">
            <input
              ref={hiddenInputRef}
              id="count-adjust-pin"
              name="count-adjust-pin"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              enterKeyHint="done"
              maxLength={PIN_LENGTH}
              value={pin}
              onChange={(event) => void handlePinInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.preventDefault();
                if (event.key === 'Escape') onCancel();
              }}
              disabled={isVerifying}
              aria-label="รหัส PIN สิทธิ์แก้ไข 6 หลัก"
              className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
            />
            <div
              data-testid="count-adjust-pin-boxes"
              className="pointer-events-none relative z-0 flex w-full flex-row justify-center gap-2"
            >
              {Array.from({ length: PIN_LENGTH }, (_, index) => {
                const isFilled = Boolean(pin[index]);
                const isActive = pin.length === index && !error;

                return (
                  <div
                    key={index}
                    aria-hidden="true"
                    className={cn(
                      'flex h-12 w-10 items-center justify-center rounded-xl border bg-card bb-shadow-sm',
                      error
                        ? 'border-red-500 bg-red-500/10'
                        : isActive
                          ? 'border-foreground ring-2 ring-foreground/10'
                          : 'border-border',
                    )}
                  >
                    {isFilled ? (
                      <span className="block h-2.5 w-2.5 rounded-full bg-foreground" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {error ? (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={onCancel}
            disabled={isVerifying}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm text-muted-foreground hover:bg-muted disabled:opacity-60"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
