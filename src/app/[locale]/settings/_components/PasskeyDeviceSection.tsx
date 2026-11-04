'use client';

import { LoadingIcon } from '@/components/ui/loading-icon';
import { useCallback, useEffect, useState } from 'react';
import { Fingerprint, ScanFace } from '@/lib/icons';
import { cn } from '@/lib/utils';
import {
  removePasskeyForCurrentDevice,
} from '@/app/actions/passkey-actions';
import {
  getOrFetchPasskeyStatus,
  invalidatePasskeyStatusCache,
} from '@/lib/settings-section-data-cache';
import {
  getBiometricLoginAvailability,
  registerDevicePasskey,
} from '@/lib/passkey/client-flow';
import {
  detectBiometricKind,
  getBiometricLabels,
  resolveBiometricKind,
  usesFaceBiometricIcon,
  type BiometricKind,
} from '@/lib/passkey/biometric-copy';
import { collectClientDeviceInfo } from '@/lib/client-device-info';
import {
  SETTINGS_BTN,
  SETTINGS_BTN_DANGER,
  SETTINGS_STATUS_CARD,
} from './settings-ui-primitives';
import { localizePasskeyError } from '@/lib/passkey/passkey-error-copy';

interface PasskeyDeviceSectionProps {
  locale: string;
}

export default function PasskeyDeviceSection({ locale }: PasskeyDeviceSectionProps) {
  const isTh = locale === 'th';
  const passkeyLocale = isTh ? 'th' : 'en';
  const [biometricKind, setBiometricKind] = useState<BiometricKind>(() =>
    detectBiometricKind()
  );
  const biometricLabels = getBiometricLabels(isTh ? 'th' : 'en', biometricKind);
  const BiometricIcon = usesFaceBiometricIcon(biometricKind) ? ScanFace : Fingerprint;
  const [supported, setSupported] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [deviceLabel, setDeviceLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async (force = false) => {
    setLoading(true);
    const device = collectClientDeviceInfo();
    const [biometric, kind] = await Promise.all([
      getBiometricLoginAvailability(),
      resolveBiometricKind(device.userAgent),
    ]);
    setBiometricKind(kind);
    const platformOk = biometric.hasPlatformAuthenticator;
    setSupported(platformOk);
    if (!platformOk) {
      setEnrolled(false);
      setDeviceLabel(null);
      setLoading(false);
      return;
    }
    if (force) invalidatePasskeyStatusCache();
    const status = await getOrFetchPasskeyStatus();
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
        setError(localizePasskeyError(result.error, passkeyLocale));
        return;
      }
      setMessage(biometricLabels.settingsEnabled);
      await loadStatus(true);
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
        setError(localizePasskeyError(result.error, passkeyLocale));
        return;
      }
      setMessage(
        isTh ? 'ลบการเข้าด้วยยืนยันตัวตนแบบไบโอเมตริกบนเครื่องนี้แล้ว' : 'Biometric login removed on this device'
      );
      await loadStatus(true);
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
        {biometricLabels.settingsUnsupported}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted-foreground font-normal leading-relaxed">
        {biometricLabels.settingsBody}
      </p>

      {enrolled ? (
        <div className={cn(SETTINGS_STATUS_CARD, 'flex items-start gap-3')}>
          <BiometricIcon size={18} strokeWidth={1.5} className="text-foreground mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[13px] text-foreground font-normal">
              {biometricLabels.settingsEnabled}
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
            className={cn(SETTINGS_BTN, 'text-[13px] py-2.5 h-auto min-h-[44px]')}
          >
            {busy ? (
              <LoadingIcon size={16} className="animate-spin" aria-hidden />
            ) : (
              <BiometricIcon size={16} aria-hidden />
            )}
            {isTh ? 'บันทึกเครื่องนี้' : 'Save this device'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleRemove()}
            disabled={busy}
            className={cn(SETTINGS_BTN_DANGER, 'text-[13px] py-2.5 h-auto min-h-[44px]')}
          >
            {busy ? <LoadingIcon size={16} className="animate-spin" aria-hidden /> : null}
            {isTh ? 'ลบการเข้าด้วยยืนยันตัวตนแบบไบโอเมตริก' : 'Remove biometric login'}
          </button>
        )}
      </div>
    </div>
  );
}
