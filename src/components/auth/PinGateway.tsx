'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { modalContent, MODAL_EASE } from '@/lib/motion-presets';
import { Lock, ShieldAlert, Loader2, Fingerprint } from 'lucide-react';
import { getAuthSessionInfo, verifyPin } from '@/app/actions/auth';
import {
  clearClientAuthSession,
  isClientAuthVerified,
  setClientAuthSession,
} from '@/lib/client-auth-storage';
import { recordLoginEvent } from '@/app/actions/login-history-actions';
import { collectClientDeviceInfo } from '@/lib/client-device-info';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import {
  getBiometricLoginAvailability,
  loginWithDevicePasskey,
  registerDevicePasskey,
  shouldOfferPasskeyEnrollment,
} from '@/lib/passkey/client-flow';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { InventoryRealtimeProvider } from '@/contexts/InventoryRealtimeContext';

const PIN_LENGTH = 6;
const BIOMETRIC_AUTO_MAX_ATTEMPTS = 3;

const COPY = {
  th: {
    title: 'เข้าสู่ระบบ',
    hint: 'กรุณากรอกรหัส PIN 6 หลัก',
    verifying: 'กำลังตรวจสอบรหัส PIN',
    pinLabel: 'รหัส PIN 6 หลัก',
    wrongPin: (n: string) => `รหัส PIN ไม่ถูกต้อง (ครั้งที่ ${n}/5)`,
    biometricFailed: 'ยืนยันตัวตนไม่สำเร็จครบ 3 ครั้ง กรุณาใส่รหัส PIN แทน',
    or: 'หรือ',
    biometricLogin: 'ใช้ลายนิ้วมือหรือใบหน้า',
    lockTitle: 'ถูกล็อกชั่วคราว',
    lockBody: 'ใส่รหัส PIN ผิดครบ 5 ครั้ง กรุณารอสักครู่แล้วลองใหม่',
    lockWait: 'กรุณารอสักครู่แล้วลองใหม่อีกครั้ง',
    enrollTitle: 'บันทึกเครื่องนี้',
    enrollBody: 'ครั้งถัดไปเข้าสู่ระบบด้วยลายนิ้วมือหรือใบหน้าได้ โดยไม่ต้องพิมพ์รหัส PIN',
    enrollAction: 'เปิดใช้ลายนิ้วมือหรือใบหน้า',
    enrollSkip: 'ข้ามไปก่อน',
  },
  en: {
    title: 'Sign in',
    hint: 'Enter your 6-digit PIN',
    verifying: 'Checking PIN…',
    pinLabel: '6-digit PIN',
    wrongPin: (n: string) => `Incorrect PIN (attempt ${n}/5)`,
    biometricFailed: 'Biometric sign-in failed 3 times. Please enter your PIN instead.',
    or: 'or',
    biometricLogin: 'Use fingerprint or face',
    lockTitle: 'Temporarily locked',
    lockBody: 'Too many incorrect PIN attempts. Please wait, then try again.',
    lockWait: 'Please wait and try again',
    enrollTitle: 'Save this device',
    enrollBody: 'Next time, sign in with fingerprint or face — no PIN typing needed.',
    enrollAction: 'Enable fingerprint or face',
    enrollSkip: 'Skip for now',
  },
} as const;

export default function PinGateway({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const locale = params?.locale === 'en' ? 'en' : 'th';
  const t = COPY[locale];
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState<number | null>(null);
  const [failedCountDisplay, setFailedCountDisplay] = useState('0');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricAttempts, setBiometricAttempts] = useState(0);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [pendingReadOnly, setPendingReadOnly] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const isVerifyingRef = useRef(false);
  const passkeyPromptInFlightRef = useRef(false);
  const biometricAttemptsRef = useRef(0);
  const biometricAutoEnabledRef = useRef(true);
  const biometricAutoPromptedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await Promise.resolve();
      if (cancelled) return;

      setIsMounted(true);

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

      const serverSession = await getAuthSessionInfo();
      if (cancelled) return;

      if (serverSession.verified) {
        setClientAuthSession(serverSession.readOnly);
        await ensureSupabaseSession();
        if (cancelled) return;

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

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void getBiometricLoginAvailability().then(availability => {
      if (cancelled) return;
      setBiometricSupported(availability.supported);
      if (!availability.canAutoTrigger) {
        biometricAutoEnabledRef.current = false;
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const completeAuthentication = useCallback(async (readOnly: boolean) => {
    setClientAuthSession(readOnly);
    setIsReadOnly(readOnly);
    await ensureSupabaseSession();
    setIsAuthenticated(true);
    setShowEnrollment(false);
    window.dispatchEvent(new CustomEvent('bb-pin-authenticated'));
  }, []);

  const passkeySkipKey = (fingerprint: string) => `bb_passkey_skip_${fingerprint}`;

  const focusPinInput = useCallback(() => {
    hiddenInputRef.current?.focus({ preventScroll: true });
  }, []);

  const recordBiometricFailure = useCallback(
    () => {
      const next = biometricAttemptsRef.current + 1;
      biometricAttemptsRef.current = next;
      setBiometricAttempts(next);
      if (next >= BIOMETRIC_AUTO_MAX_ATTEMPTS) {
        biometricAutoEnabledRef.current = false;
        window.setTimeout(focusPinInput, 120);
      }
    },
    [focusPinInput]
  );

  const handlePasskeyLogin = useCallback(
    async (trigger: 'auto' | 'manual' = 'manual') => {
      if (
        passkeyPromptInFlightRef.current ||
        isVerifyingRef.current ||
        lockoutTimeLeft !== null
      ) {
        return;
      }

      if (
        trigger === 'auto' &&
        (biometricAutoPromptedRef.current ||
          !biometricAutoEnabledRef.current ||
          biometricAttemptsRef.current >= BIOMETRIC_AUTO_MAX_ATTEMPTS)
      ) {
        return;
      }

      if (trigger === 'auto') {
        biometricAutoPromptedRef.current = true;
      }

      if (
        trigger === 'manual' &&
        biometricAttemptsRef.current >= BIOMETRIC_AUTO_MAX_ATTEMPTS
      ) {
        biometricAttemptsRef.current = 0;
        setBiometricAttempts(0);
      }

      if (trigger === 'manual') {
        biometricAutoEnabledRef.current = false;
      }

      passkeyPromptInFlightRef.current = true;
      setPasskeyBusy(true);
      setPasskeyError(null);
      hiddenInputRef.current?.blur();

      try {
        const device = collectClientDeviceInfo();
        const res = await loginWithDevicePasskey(device);
        if (!res.success) {
          setPasskeyError(res.error);
          recordBiometricFailure();
          return;
        }

        localStorage.removeItem('bb_failed_attempts');
        localStorage.removeItem('bb_lockout_until');
        setFailedCountDisplay('0');
        biometricAttemptsRef.current = 0;
        setBiometricAttempts(0);
        await completeAuthentication(Boolean(res.isReadOnly));
      } finally {
        passkeyPromptInFlightRef.current = false;
        setPasskeyBusy(false);
      }
    },
    [completeAuthentication, lockoutTimeLeft, recordBiometricFailure]
  );

  // Automatic biometric prompt has been disabled per user request
  // to prevent sudden interruptions while the app is in use.

  const handleEnrollment = async () => {
    setPasskeyBusy(true);
    setPasskeyError(null);
    try {
      const device = collectClientDeviceInfo();
      const res = await registerDevicePasskey(device);
      if (!res.success) {
        setPasskeyError(res.error);
        return;
      }
      if (device.sessionFingerprint) {
        localStorage.removeItem(passkeySkipKey(device.sessionFingerprint));
      }
      await completeAuthentication(pendingReadOnly);
    } finally {
      setPasskeyBusy(false);
    }
  };

  const handleSkipEnrollment = async () => {
    const device = collectClientDeviceInfo();
    if (device.sessionFingerprint) {
      localStorage.setItem(passkeySkipKey(device.sessionFingerprint), '1');
    }
    await completeAuthentication(pendingReadOnly);
  };

  useEffect(() => {
    if (isAuthenticated || lockoutTimeLeft !== null || showEnrollment) return;

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
  }, [isAuthenticated, lockoutTimeLeft, showEnrollment]);

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
      queueMicrotask(() => {
        setLockoutTimeLeft(null);
        localStorage.removeItem('bb_lockout_until');
        localStorage.removeItem('bb_failed_attempts');
        setFailedCountDisplay('0');
      });
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
        localStorage.removeItem('bb_failed_attempts');
        localStorage.removeItem('bb_lockout_until');
        setFailedCountDisplay('0');
        biometricAttemptsRef.current = 0;
        setBiometricAttempts(0);

        const fingerprint = device.sessionFingerprint;
        const skippedEnrollment =
          fingerprint && localStorage.getItem(passkeySkipKey(fingerprint)) === '1';
        const offerEnrollment =
          !skippedEnrollment &&
          (await shouldOfferPasskeyEnrollment(fingerprint));

        if (offerEnrollment) {
          setPendingReadOnly(Boolean(res.isReadOnly));
          setShowEnrollment(true);
          return;
        }

        await completeAuthentication(Boolean(res.isReadOnly));
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

  if (!isMounted) {
    return (
      <div className="min-h-[100svh] bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" strokeWidth={1.5} />
      </div>
    );
  }

  if (showEnrollment) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-4 antialiased overflow-hidden">
        <motion.div
          initial={modalContent.initial}
          animate={modalContent.animate}
          transition={modalContent.transition}
          className="w-full max-w-sm flex flex-col items-center gap-6 text-center"
        >
          <div className="w-16 h-16 bg-foreground text-background rounded-[24px] flex items-center justify-center bb-shadow-lg">
            <Fingerprint size={32} strokeWidth={1.5} />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-normal text-foreground tracking-wide">
              {t.enrollTitle}
            </h1>
            <p className="text-sm font-normal text-muted-foreground leading-relaxed px-2">
              {t.enrollBody}
            </p>
          </div>

          {passkeyError ? (
            <p className="text-sm font-normal text-red-500">{passkeyError}</p>
          ) : null}

          <div className="flex flex-col w-full gap-2">
            <button
              type="button"
              onClick={() => void handleEnrollment()}
              disabled={passkeyBusy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground text-background px-4 py-3 text-sm font-normal disabled:opacity-60"
            >
              {passkeyBusy ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Fingerprint size={18} strokeWidth={1.5} />
              )}
              {t.enrollAction}
            </button>
            <button
              type="button"
              onClick={() => void handleSkipEnrollment()}
              disabled={passkeyBusy}
              className="inline-flex w-full items-center justify-center rounded-2xl border border-border px-4 py-3 text-sm font-normal text-muted-foreground disabled:opacity-60"
            >
              {t.enrollSkip}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

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
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-[24px] flex items-center justify-center bb-shadow-sm">
            <ShieldAlert size={32} strokeWidth={1.5} />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-normal text-foreground tracking-wide">{t.lockTitle}</h1>
            <p className="text-sm font-normal text-muted-foreground px-4 leading-relaxed">
              {t.lockBody}
            </p>
          </div>

          <div className="text-5xl font-normal text-foreground tracking-wider">
            {formatTimeLeft(lockoutTimeLeft)}
          </div>

          <p className="text-xs font-normal text-muted-foreground">
            {t.lockWait}
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
          className="w-16 h-16 bg-foreground text-background rounded-[24px] flex items-center justify-center bb-shadow-lg"
        >
          <Lock size={32} strokeWidth={1.5} />
        </motion.div>

        <div className="text-center space-y-2 min-h-[2.75rem] flex flex-col items-center justify-center">
          <h1 className="text-2xl font-normal text-foreground tracking-wide">{t.title}</h1>
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
                className="text-sm font-normal text-muted-foreground"
              >
                {t.verifying}
              </motion.p>
            ) : (
              <motion.p
                key="pin-idle"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.16, ease: MODAL_EASE }}
                className="text-sm font-normal text-muted-foreground"
              >
                {t.hint}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="relative flex w-full max-w-[320px] min-h-16 items-center justify-center">
          <AnimatePresence mode="wait" initial={false}>
            {isVerifying ? (
              <motion.div
                key="pin-verifying-spinner"
                initial={{ opacity: 0, scale: 0.92, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -2 }}
                transition={{ duration: 0.18, ease: MODAL_EASE }}
                className="flex h-16 w-16 items-center justify-center rounded-[24px] border border-border bg-card bb-shadow-sm"
                aria-hidden="true"
              >
                <Loader2 className="h-7 w-7 animate-spin text-foreground" strokeWidth={1.5} />
              </motion.div>
            ) : (
              <motion.div
                key="pin-input-fields"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.16, ease: MODAL_EASE }}
                className="relative w-full"
              >
                <input
                  ref={hiddenInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  enterKeyHint="done"
                  maxLength={PIN_LENGTH}
                  value={pin}
                  onChange={e => void handlePinInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') e.preventDefault();
                  }}
                  disabled={lockoutTimeLeft !== null}
                  aria-label={t.pinLabel}
                  className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
                />
                <div
                  data-testid="pin-digit-boxes"
                  className="pointer-events-none relative z-0 flex w-full flex-row justify-center gap-2"
                >
                  {Array.from({ length: PIN_LENGTH }, (_, index) => {
                    const isFilled = Boolean(pin[index]);
                    const isActive = pin.length === index && !error;

                    return (
                      <motion.div
                        key={index}
                        aria-hidden="true"
                        layout
                        transition={{ duration: 0.2, ease: MODAL_EASE }}
                        className={`flex h-14 w-12 items-center justify-center rounded-2xl border bg-card bb-shadow-sm md:h-16 md:w-14 ${
                          error
                            ? 'border-red-500 bg-red-500/10'
                            : isActive
                              ? 'border-foreground ring-2 ring-foreground/10'
                              : 'border-border'
                        }`}
                      >
                        {isFilled && (
                          <motion.span
                            layout
                            initial={false}
                            className="block h-3.5 w-3.5 rounded-full bg-foreground"
                          />
                        )}
                      </motion.div>
                    );
                  })}
                </div>
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
            {t.wrongPin(failedCountDisplay)}
          </motion.p>
        )}

        {passkeyError && !error ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-normal text-red-500 tracking-wide text-center px-2"
          >
            {passkeyError}
          </motion.p>
        ) : null}

        {!error && biometricAttempts >= BIOMETRIC_AUTO_MAX_ATTEMPTS ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-normal text-muted-foreground tracking-wide text-center px-2"
          >
            {t.biometricFailed}
          </motion.p>
        ) : null}

        {biometricSupported && !isVerifying ? (
          <div className="w-full max-w-[320px] flex flex-col items-center gap-2">
            <div className="w-full flex items-center gap-3 text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] tracking-wide">{t.or}</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <button
              type="button"
              onClick={() => void handlePasskeyLogin('manual')}
              disabled={passkeyBusy || lockoutTimeLeft !== null}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-normal text-foreground disabled:opacity-60"
            >
              {passkeyBusy ? (
                <Loader2 size={18} className="animate-spin" strokeWidth={1.5} />
              ) : (
                <Fingerprint size={18} strokeWidth={1.5} />
              )}
              {t.biometricLogin}
            </button>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
