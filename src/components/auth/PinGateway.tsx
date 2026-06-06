'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Lock, ShieldAlert } from 'lucide-react';
import { verifyPin } from '@/app/actions/auth';
import { ensureSupabaseSession } from '@/lib/supabase-session';
import { AuthProvider } from '@/components/providers/AuthProvider';

export default function PinGateway({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState<number | null>(null);
  const [failedCountDisplay, setFailedCountDisplay] = useState('0');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setIsMounted(true);
    
    // Enforce sessionStorage for authenticating state
    const isVerified = sessionStorage.getItem('bb_auth_pin_verified') === 'true';
    if (isVerified) {
      void ensureSupabaseSession();
      setIsReadOnly(sessionStorage.getItem('bb_auth_read_only') === 'true');
      setIsAuthenticated(true);
    } else {
      setIsReadOnly(false);
      setIsAuthenticated(false);
    }

    // Lockout check
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

  // Lockout timer countdown
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

  const handleChange = async (index: number, value: string) => {
    if (lockoutTimeLeft !== null) return;
    if (!/^\d*$/.test(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError(false);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 5 && value) {
      const fullPin = newPin.join('');
      
      // Verify PIN via Server Action
      const res = await verifyPin(fullPin);
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
      } else {
        setError(true);
        
        // Increment failed attempts
        const attempts = Number(localStorage.getItem('bb_failed_attempts') || '0') + 1;
        localStorage.setItem('bb_failed_attempts', attempts.toString());
        setFailedCountDisplay(attempts.toString());
        
        if (attempts >= 5) {
          const lockoutDuration = 15 * 60 * 1000; // 15 minutes
          const lockoutUntil = new Date(Date.now() + lockoutDuration).toISOString();
          localStorage.setItem('bb_lockout_until', lockoutUntil);
          setLockoutTimeLeft(15 * 60);
        }

        setTimeout(() => {
          setPin(['', '', '', '', '', '']);
          setError(false);
          if (lockoutTimeLeft === null && attempts < 5) {
            inputRefs.current[0]?.focus();
          }
        }, 500);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  if (!isMounted) return null;

  if (isAuthenticated) {
    return <AuthProvider isReadOnly={isReadOnly}>{children}</AuthProvider>;
  }

  if (lockoutTimeLeft !== null) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#fdfcf0] flex flex-col items-center justify-center p-4 antialiased">
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
    <div className="fixed inset-0 z-[9999] bg-[#fdfcf0] flex flex-col items-center justify-center p-4 antialiased">
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

        <div className="flex flex-row justify-center gap-2 w-full">
          {pin.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              disabled={lockoutTimeLeft !== null}
              className={`w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-normal text-neutral-900 bg-white border ${error ? 'border-red-500 bg-red-50 text-red-500' : 'border-black/10 focus:border-black'} rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-black/5 transition-all`}
            />
          ))}
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
