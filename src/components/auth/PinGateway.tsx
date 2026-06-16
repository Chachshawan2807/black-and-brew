'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { modalContent, MODAL_EASE } from '@/lib/motion-presets';
import { Lock, ShieldAlert, Loader2 } from 'lucide-react';
import { getAuthSessionInfo, verifyPin } from '@/app/actions/auth';
import {
  clearClientAuthSession,
  isClientAuthVerified,
  setClientAuthSession,
} from '@/lib/client-auth-storage';
import { recordLoginEvent } from '@/app/actions/login-history-actions';
import { collectClientDeviceInfo } from '@/lib/client-device-info';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { InventoryRealtimeProvider } from '@/contexts/InventoryRealtimeContext';

const PIN_LENGTH = 6;

export default function PinGateway({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState<number | null>(null);
  const [failedCountDisplay, setFailedCountDisplay] = useState('0');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const isVerifyingRef = useRef(false);

  useEffect(() => {
    setIsMounted(true);

    void (async () => {
      const serverSession = await getAuthSessionInfo();
      if (serverSession.verified) {
        setClientAuthSession(serverSession.readOnly);
        await ensureSupabaseSession();
        setIsReadOnly(serverSession.readOnly);
        setIsAuthenticated(true);
        window.dispatchEvent(new CustomEvent('bb-pin-authenticated'));
        return;
      }

      if (isClientAuthVerified()) {
        clearClientAuthSession();
      }
      setIsReadOnly(false);
      setIsAuthenticated(false);
    })();

    const storedLockout = localStorage.getItem('bb_lockout_until');
    const storedAttempts = localStorage.getItem('bb_failed_attempts') || '0';
    setFailedCountDisplay(storedAttempts);

    if (storedLockout) {
      const until = new Date(storedLockout).getTime();
      const now = Date.now();
      if (until > now) {
        setLockoutTimeLeft(Math.ceil((until - now) / 1000));
      } else {
        localStorage.removeItem('bb_lockout_until');
        localStorage.removeItem('bb_failed_attempts');
        setFailedCountDisplay('0');
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated || lockoutTimeLeft !== null) return;

    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousWidth = document.body.style.width;
    const previousTop = document.body.style.top;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = '0';

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.width = previousWidth;
      document.body.style.top = previousTop;
    };
  }, [isAuthenticated, lockoutTimeLeft]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateKeyboardState = () => {
      setIsKeyboardOpen(viewport.height < window.innerHeight * 0.82);
    };

    viewport.addEventListener('resize', updateKeyboardState);
    viewport.addEventListener('scroll', updateKeyboardState);
    updateKeyboardState();

    return () => {
      viewport.removeEventListener('resize', updateKeyboardState);
      viewport.removeEventListener('scroll', updateKeyboardState);
    };
  }, []);

  useEffect(() => {
    if (!isMounted || isAuthenticated || lockoutTimeLeft !== null || isVerifying) return;

    const focusInput = () => hiddenInputRef.current?.focus({ preventScroll: true });
    const timer = window.setTimeout(focusInput, 120);
    return () => window.clearTimeout(timer);
  }, [isMounted, isAuthenticated, lockoutTimeLeft, isVerifying]);

  useEffect(() => {
    if (lockoutTimeLeft === null) return;
    if (lockoutTimeLeft <= 0) {
      setLockoutTimeLeft(null);
      localStorage.removeItem('bb_lockout_until');
      localStorage.removeItem('bb_failed_attempts');
      setFailedCountDisplay('0');
      return;
    }

    const timer = setTimeout(() => {
      setLockoutTimeLeft(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [lockoutTimeLeft]);

  const formatTimeLeft = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const focusPinInput = () => {
    hiddenInputRef.current?.focus({ preventScroll: true });
  };

  const handlePinInput = async (value: string) => {
    if (lockoutTimeLeft !== null || isVerifyingRef.current) return;

    const nextPin = value.replace(/\D/g, '').slice(0, PIN_LENGTH);
    setPin(nextPin);
    setError(false);

    if (nextPin.length < PIN_LENGTH) return;

    isVerifyingRef.current = true;
    setIsVerifying(true);
    hiddenInputRef.current?.blur();

    try {
      const device = collectClientDeviceInfo();
      const res = await verifyPin(nextPin, device);
      if (res.success) {
        setClientAuthSession(Boolean(res.isReadOnly));
        setIsReadOnly(Boolean(res.isReadOnly));
        localStorage.removeItem('bb_failed_attempts');
        localStorage.removeItem('bb_lockout_until');
        setFailedCountDisplay('0');
        await ensureSupabaseSession();
        setIsAuthenticated(true);
        window.dispatchEvent(new CustomEvent('bb-pin-authenticated'));
        return;
      }

      setError(true);

      const attempts = Number(localStorage.getItem('bb_failed_attempts') || '0') + 1;
      localStorage.setItem('bb_failed_attempts', attempts.toString());
      setFailedCountDisplay(attempts.toString());

      if (attempts >= 5) {
        const lockoutDuration = 15 * 60 * 1000;
        const lockoutUntil = new Date(Date.now() + lockoutDuration).toISOString();
        localStorage.setItem('bb_lockout_until', lockoutUntil);
        setLockoutTimeLeft(15 * 60);
        void recordLoginEvent({
          eventType: 'lockout',
          status: 'blocked',
          device,
          failureReason: '5 consecutive failed PIN attempts',
        });
      }

      window.setTimeout(() => {
        setPin('');
        setError(false);
        if (attempts < 5) {
          focusPinInput();
        }
      }, 500);
    } finally {
      isVerifyingRef.current = false;
      setIsVerifying(false);
    }
  };

  if (!isMounted) return null;

  if (isAuthenticated) {
    return (
      <AuthProvider isReadOnly={isReadOnly}>
        <InventoryRealtimeProvider>{children}</InventoryRealtimeProvider>
      </AuthProvider>
    );
  }

  if (lockoutTimeLeft !== null) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-4 antialiased overflow-hidden">
        <motion.div
          initial={modalContent.initial}
          animate={modalContent.animate}
          transition={modalContent.transition}
          className="w-full max-w-sm flex flex-col items-center gap-8 text-center"
        >
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-[24px] flex items-center justify-center shadow-sm">
            <ShieldAlert size={32} strokeWidth={1.5} />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-normal text-foreground tracking-[0.2em] uppercase">Gateway Locked</h1>
            <p className="text-sm font-normal text-muted-foreground tracking-[0.1em] uppercase px-4 leading-relaxed">
              ป้อนรหัสผิดครบ 5 ครั้ง บัญชีถูกล็อกชั่วคราวเพื่อความปลอดภัย
            </p>
          </div>

          <div className="text-5xl font-normal text-foreground tracking-wider">
            {formatTimeLeft(lockoutTimeLeft)}
          </div>

          <p className="text-xs font-normal text-muted-foreground tracking-[0.05em] uppercase">
            กรุณารอสักครู่แล้วลองใหม่อีกครั้ง
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-background overflow-hidden flex flex-col items-center px-4 antialiased transition-[padding] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isKeyboardOpen ? 'justify-start pt-[min(16svh,128px)]' : 'justify-center'
      }`}
    >
      <motion.div
        layout
        initial={modalContent.initial}
        animate={modalContent.animate}
        transition={modalContent.transition}
        className="w-full max-w-sm flex flex-col items-center gap-8"
      >
        <motion.div
          animate={
            isVerifying
              ? { scale: [1, 1.04, 1], opacity: [1, 0.88, 1] }
              : { scale: 1, opacity: 1 }
          }
          transition={{
            duration: 1.8,
            repeat: isVerifying ? Infinity : 0,
            ease: 'easeInOut',
          }}
          className="w-16 h-16 bg-foreground text-background rounded-[24px] flex items-center justify-center shadow-lg"
        >
          <Lock size={32} strokeWidth={1.5} />
        </motion.div>

        <div className="text-center space-y-2 min-h-[2.75rem] flex flex-col items-center justify-center">
          <h1 className="text-2xl font-normal text-foreground tracking-[0.2em] uppercase">Security Gateway</h1>
          <AnimatePresence mode="wait" initial={false}>
            {isVerifying ? (
              <motion.p
                key="pin-verifying"
                role="status"
                aria-live="polite"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.16, ease: MODAL_EASE }}
                className="text-sm font-normal text-muted-foreground tracking-[0.08em] uppercase"
              >
                กำลังตรวจสอบรหัสผ่าน
              </motion.p>
            ) : (
              <motion.p
                key="pin-idle"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.16, ease: MODAL_EASE }}
                className="text-sm font-normal text-muted-foreground tracking-[0.1em] uppercase"
              >
                กรุณากรอกรหัสผ่าน 6 หลักเพื่อเข้าสู่ระบบ
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="relative w-full max-w-[320px]">
          <input
            ref={hiddenInputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            enterKeyHint="done"
            maxLength={PIN_LENGTH}
            value={pin}
            readOnly={isVerifying}
            aria-busy={isVerifying}
            onChange={e => void handlePinInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') e.preventDefault();
            }}
            disabled={lockoutTimeLeft !== null}
            aria-label="รหัสผ่าน 6 หลัก"
            className={`absolute inset-0 z-10 h-full w-full opacity-0 ${
              isVerifying ? 'pointer-events-none' : 'cursor-text'
            }`}
          />
          <motion.div
            animate={{
              opacity: isVerifying ? 0.5 : 1,
              scale: isVerifying ? 0.985 : 1,
            }}
            transition={{ duration: 0.22, ease: MODAL_EASE }}
            className="pointer-events-none relative z-0 flex flex-row justify-center gap-2 w-full"
          >
            {Array.from({ length: PIN_LENGTH }, (_, index) => {
              const isFilled = Boolean(pin[index]);
              const isActive = pin.length === index && !error && !isVerifying;

              return (
                <motion.div
                  key={index}
                  aria-hidden="true"
                  layout
                  transition={{ duration: 0.2, ease: MODAL_EASE }}
                  className={`w-12 h-14 md:w-14 md:h-16 flex items-center justify-center bg-card border rounded-2xl shadow-sm ${
                    error
                      ? 'border-red-500 bg-red-500/10'
                      : isVerifying && isFilled
                        ? 'border-foreground/35'
                        : isActive
                          ? 'border-foreground ring-2 ring-foreground/10'
                          : 'border-border'
                  }`}
                >
                  {isFilled && (
                    <motion.span
                      layout
                      initial={false}
                      animate={{ scale: isVerifying ? 0.92 : 1, opacity: isVerifying ? 0.75 : 1 }}
                      transition={{ duration: 0.2, ease: MODAL_EASE }}
                      className="block w-3.5 h-3.5 rounded-full bg-foreground"
                    />
                  )}
                </motion.div>
              );
            })}
          </motion.div>
          <AnimatePresence>
            {isVerifying && (
              <motion.div
                key="pin-verify-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16, ease: MODAL_EASE }}
                className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
                aria-hidden="true"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -2 }}
                  transition={{ duration: 0.18, ease: MODAL_EASE }}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card/90 shadow-sm backdrop-blur-sm"
                >
                  <Loader2 className="w-5 h-5 animate-spin text-foreground" strokeWidth={1.5} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-normal text-red-500 tracking-wide"
          >
            รหัสผ่านไม่ถูกต้อง (ครั้งที่ {failedCountDisplay}/5)
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
