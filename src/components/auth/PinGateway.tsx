'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Lock, ShieldAlert } from 'lucide-react';
import { verifyPin } from '@/app/actions/auth';
import { recordLoginEvent } from '@/app/actions/login-history-actions';
import { collectClientDeviceInfo } from '@/lib/client-device-info';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import { AuthProvider } from '@/components/providers/AuthProvider';

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
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  const isVerifyingRef = useRef(false);

  useEffect(() => {
    setIsMounted(true);

    const isVerified = sessionStorage.getItem('bb_auth_pin_verified') === 'true';
    if (isVerified) {
      void ensureSupabaseSession();
      setIsReadOnly(sessionStorage.getItem('bb_auth_read_only') === 'true');
      setIsAuthenticated(true);
    } else {
      setIsReadOnly(false);
      setIsAuthenticated(false);
    }

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
    if (!isMounted || isAuthenticated || lockoutTimeLeft !== null) return;

    const focusInput = () => hiddenInputRef.current?.focus({ preventScroll: true });
    const timer = window.setTimeout(focusInput, 120);
    return () => window.clearTimeout(timer);
  }, [isMounted, isAuthenticated, lockoutTimeLeft]);

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

    try {
      const device = collectClientDeviceInfo();
      const res = await verifyPin(nextPin, device);
      if (res.success) {
        sessionStorage.setItem('bb_auth_pin_verified', 'true');
        if (res.isReadOnly) {
          sessionStorage.setItem('bb_auth_read_only', 'true');
          setIsReadOnly(true);
        } else {
          sessionStorage.removeItem('bb_auth_read_only');
          setIsReadOnly(false);
        }
        localStorage.removeItem('bb_failed_attempts');
        localStorage.removeItem('bb_lockout_until');
        setFailedCountDisplay('0');
        await ensureSupabaseSession();
        setIsAuthenticated(true);
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
    }
  };

  if (!isMounted) return null;

  if (isAuthenticated) {
    return <AuthProvider isReadOnly={isReadOnly}>{children}</AuthProvider>;
  }

  if (lockoutTimeLeft !== null) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-4 antialiased overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm flex flex-col items-center gap-8 text-center"
        >
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-[24px] flex items-center justify-center shadow-sm">
            <ShieldAlert size={32} strokeWidth={1.5} />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-normal text-neutral-900 tracking-[0.2em] uppercase">Gateway Locked</h1>
            <p className="text-sm font-normal text-neutral-500 tracking-[0.1em] uppercase px-4 leading-relaxed">
              ป้อนรหัสผิดครบ 5 ครั้ง บัญชีถูกล็อกชั่วคราวเพื่อความปลอดภัย
            </p>
          </div>

          <div className="text-5xl font-normal text-neutral-950 tracking-wider">
            {formatTimeLeft(lockoutTimeLeft)}
          </div>

          <p className="text-xs font-normal text-neutral-400 tracking-[0.05em] uppercase">
            กรุณารอสักครู่แล้วลองใหม่อีกครั้ง
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-background overflow-hidden flex flex-col items-center px-4 antialiased transition-[padding] duration-200 ${
        isKeyboardOpen ? 'justify-start pt-[min(16svh,128px)]' : 'justify-center'
      }`}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm flex flex-col items-center gap-8"
      >
        <div className="w-16 h-16 bg-black text-white rounded-[24px] flex items-center justify-center shadow-lg">
          <Lock size={32} strokeWidth={1.5} />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-normal text-neutral-900 tracking-[0.2em] uppercase">Security Gateway</h1>
          <p className="text-sm font-normal text-neutral-500 tracking-[0.1em] uppercase">กรุณากรอกรหัสผ่าน 6 หลักเพื่อเข้าสู่ระบบ</p>
        </div>

        <div className="relative w-full max-w-[320px]">
          <input
            ref={hiddenInputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            maxLength={PIN_LENGTH}
            value={pin}
            onChange={e => void handlePinInput(e.target.value)}
            disabled={lockoutTimeLeft !== null}
            aria-label="รหัสผ่าน 6 หลัก"
            className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
          />
          <div className="pointer-events-none relative z-0 flex flex-row justify-center gap-2 w-full">
            {Array.from({ length: PIN_LENGTH }, (_, index) => {
              const isFilled = Boolean(pin[index]);
              const isActive = pin.length === index && !error;

              return (
                <div
                  key={index}
                  aria-hidden="true"
                  className={`w-12 h-14 md:w-14 md:h-16 flex items-center justify-center bg-white border rounded-2xl shadow-sm transition-all ${
                    error
                      ? 'border-red-500 bg-red-50'
                      : isActive
                        ? 'border-black ring-2 ring-black/5'
                        : 'border-black/10'
                  }`}
                >
                  {isFilled && <span className="block w-3.5 h-3.5 rounded-full bg-neutral-900" />}
                </div>
              );
            })}
          </div>
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
