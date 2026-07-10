'use client';

import { useCallback, useEffect, useState } from 'react';
import { Fingerprint, Loader2 } from 'lucide-react';
import {
  getCurrentDevicePasskeyStatus,
  removePasskeyForCurrentDevice,
} from '@/app/actions/passkey-actions';
import {
  getBiometricLoginAvailability,
  registerDevicePasskey,
} from '@/lib/passkey/client-flow';
import { collectClientDeviceInfo } from '@/lib/client-device-info';

interface PasskeyDeviceSectionProps {
  locale: string;
}

const PASSKEY_ERROR_MAP: Record<string, { th: string; en: string }> = {
  'กรุณาเข้าสู่ระบบด้วยรหัส PIN ก่อนบันทึกเครื่องนี้': {
    th: 'กรุณาเข้าสู่ระบบด้วยรหัส PIN ก่อนบันทึกเครื่องนี้',
    en: 'Sign in with your PIN before saving this device',
  },
  'กรุณาเข้าสู่ระบบด้วยรหัส PIN ก่อน': {
    th: 'กรุณาเข้าสู่ระบบด้วยรหัส PIN ก่อน',
    en: 'Sign in with your PIN first',
  },
  'กรุณาเข้าสู่ระบบก่อน': {
    th: 'กรุณาเข้าสู่ระบบก่อน',
    en: 'Please sign in first',
  },
  'ไม่พบข้อมูลอุปกรณ์': {
    th: 'ไม่พบข้อมูลอุปกรณ์',
    en: 'Device information is missing',
  },
  'ไม่พบข้อมูลเครื่องนี้': {
    th: 'ไม่พบข้อมูลเครื่องนี้',
    en: 'This device could not be identified',
  },
  'ไม่สามารถเตรียมการลงทะเบียนลายนิ้วมือได้': {
    th: 'ไม่สามารถเตรียมการลงทะเบียนลายนิ้วมือได้',
    en: 'Could not start biometric registration',
  },
  'ข้อมูลลงทะเบียนไม่ถูกต้อง': {
    th: 'ข้อมูลลงทะเบียนไม่ถูกต้อง',
    en: 'Invalid registration data',
  },
  'หมดเวลาลงทะเบียน กรุณาลองใหม่': {
    th: 'หมดเวลาลงทะเบียน กรุณาลองใหม่',
    en: 'Registration timed out. Try again',
  },
  'ยืนยันลายนิ้วมือไม่สำเร็จ': {
    th: 'ยืนยันลายนิ้วมือไม่สำเร็จ',
    en: 'Biometric verification failed',
  },
  'บันทึกลายนิ้วมือไม่สำเร็จ': {
    th: 'บันทึกลายนิ้วมือไม่สำเร็จ',
    en: 'Could not save biometric login',
  },
  'ลงทะเบียนลายนิ้วมือไม่สำเร็จ': {
    th: 'ลงทะเบียนลายนิ้วมือไม่สำเร็จ',
    en: 'Biometric registration failed',
  },
  'ลบลายนิ้วมือไม่สำเร็จ': {
    th: 'ลบลายนิ้วมือไม่สำเร็จ',
    en: 'Could not remove biometric login',
  },
  'ยกเลิกการสแกนลายนิ้วมือ/ใบหน้า': {
    th: 'ยกเลิกการสแกนลายนิ้วมือ/ใบหน้า',
    en: 'Biometric scan cancelled',
  },
  'การสแกนลายนิ้วมือ/ใบหน้าถูกยกเลิก': {
    th: 'การสแกนลายนิ้วมือ/ใบหน้าถูกยกเลิก',
    en: 'Biometric scan was cancelled',
  },
};

function localizePasskeyError(error: string, isTh: boolean): string {
  const mapped = PASSKEY_ERROR_MAP[error];
  if (mapped) return isTh ? mapped.th : mapped.en;
  return error;
}

export default function PasskeyDeviceSection({ locale }: PasskeyDeviceSectionProps) {
  const isTh = locale === 'th';
  const [supported, setSupported] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    const biometric = await getBiometricLoginAvailability();
    const platformOk = biometric.hasPlatformAuthenticator;
    setSupported(platformOk);
    if (!platformOk) {
      setEnrolled(false);
      setDeviceLabel(null);
      setLoading(false);
      return;
    }
    const status = await getCurrentDevicePasskeyStatus();
    setEnrolled(status.enrolled);
    setDeviceLabel(status.deviceLabel);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch passkey status on mount
    void loadStatus();
  }, [loadStatus]);

  const handleRegister = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const device = collectClientDeviceInfo();
      const result = await registerDevicePasskey(device);
      if (!result.success) {
        setError(localizePasskeyError(result.error, isTh));
        return;
      }
      setMessage(
        isTh
          ? 'บันทึกเครื่องนี้ด้วยลายนิ้วมือ/ใบหน้าเรียบร้อยแล้ว'
          : 'Biometric login enabled on this device'
      );
      await loadStatus();
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await removePasskeyForCurrentDevice();
      if (!result.success) {
        setError(localizePasskeyError(result.error, isTh));
        return;
      }
      setMessage(
        isTh ? 'ลบการเข้าด้วยลายนิ้วมือบนเครื่องนี้แล้ว' : 'Biometric login removed on this device'
      );
      await loadStatus();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="h-14 rounded-2xl bg-muted/40 animate-pulse" aria-busy="true" />
    );
  }

  if (!supported) {
    return (
      <p className="text-[13px] text-muted-foreground font-normal leading-relaxed">
        {isTh
          ? 'อุปกรณ์นี้ยังไม่รองรับลายนิ้วมือหรือใบหน้า — ใช้ PIN ได้ตามปกติ'
          : 'This device does not support biometrics — you can still use a PIN.'}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted-foreground font-normal leading-relaxed">
        {isTh
          ? 'ใช้ลายนิ้วมือหรือใบหน้าแทนการพิมพ์ PIN บนเครื่องที่ไว้ใจ'
          : 'Use fingerprint or face instead of a PIN on trusted devices'}
      </p>

      {enrolled ? (
        <div className="rounded-2xl border border-border bg-card px-4 py-3 flex items-start gap-3">
          <Fingerprint size={18} strokeWidth={1.5} className="text-foreground mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[13px] text-foreground font-normal">
              {isTh ? 'เปิดใช้งานแล้วบนเครื่องนี้' : 'Enabled on this device'}
            </p>
            {deviceLabel ? (
              <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{deviceLabel}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div aria-live="polite">
        {message ? <p className="text-[13px] text-foreground">{message}</p> : null}
        {error ? <p className="text-[13px] text-red-500" role="alert">{error}</p> : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {!enrolled ? (
          <button
            type="button"
            onClick={() => void handleRegister()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-[13px] text-foreground font-normal disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Fingerprint size={16} />}
            {isTh ? 'บันทึกเครื่องนี้' : 'Save this device'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleRemove()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-2xl border border-border px-4 py-2.5 text-[13px] text-muted-foreground font-normal disabled:opacity-60"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            {isTh ? 'ลบการเข้าด้วยลายนิ้วมือ' : 'Remove biometric login'}
          </button>
        )}
      </div>
    </div>
  );
}
