'use client';

import { useCallback, useEffect, useState } from 'react';
import { Fingerprint, Loader2 } from 'lucide-react';
import {
  getCurrentDevicePasskeyStatus,
  removePasskeyForCurrentDevice,
} from '@/app/actions/passkey-actions';
import {
  isBiometricLoginAvailable,
  registerDevicePasskey,
} from '@/lib/passkey/client-flow';
import { collectClientDeviceInfo } from '@/lib/client-device-info';

interface PasskeyDeviceSectionProps {
  locale: string;
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
    const biometric = await isBiometricLoginAvailable();
    setSupported(biometric);
    if (!biometric) {
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
        setError(result.error);
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
        setError(result.error);
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
      <p className="text-[13px] text-muted-foreground font-normal">
        {isTh ? 'กำลังตรวจสอบ…' : 'Checking…'}
      </p>
    );
  }

  if (!supported) {
    return (
      <p className="text-[13px] text-muted-foreground font-normal leading-relaxed">
        {isTh
          ? 'เครื่องหรือเบราว์เซอร์นี้ยังไม่รองรับการเข้าด้วยลายนิ้วมือ/ใบหน้า ใช้รหัส PIN ตามปกติได้'
          : 'This device or browser does not support biometric login. You can still use PIN.'}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted-foreground font-normal leading-relaxed">
        {isTh
          ? 'บันทึกเครื่องนี้เพื่อเข้าระบบด้วยลายนิ้วมือหรือสแกนใบหน้าแทนการพิมพ์ PIN (เครื่องที่ไว้ใจแล้วเท่านั้น)'
          : 'Save this device to sign in with fingerprint or face instead of typing the PIN.'}
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

      {message ? <p className="text-[13px] text-foreground">{message}</p> : null}
      {error ? <p className="text-[13px] text-red-500">{error}</p> : null}

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
