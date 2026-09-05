'use client';

import { useState } from 'react';
import { LogOut, Monitor, Smartphone, Tablet } from '@/lib/icons';
import type { ActiveLoginSession } from '@/lib/login-session-status';
import {
  forceRevokeAllRemoteSessions,
  forceRevokeDeviceSession,
} from '@/app/actions/auth';
import { collectClientDeviceInfo } from '@/lib/client-device-info';
import { formatLoginDeviceLabel } from '@/lib/format-login-device';
import { cn } from '@/lib/utils';
import {
  SETTINGS_BTN_DANGER,
  SETTINGS_BTN_GHOST,
  SETTINGS_FIELD,
  SETTINGS_LIST_ITEM,
  SETTINGS_PANEL_DANGER,
  SettingsIconBadge,
} from './settings-ui-primitives';

const PIN_LENGTH = 6;

interface ActiveRemoteSessionsPanelProps {
  locale: string;
  sessions: ActiveLoginSession[];
  loading: boolean;
  loadError: string | null;
  onReload: () => Promise<void> | void;
}

function deviceIcon(type: string) {
  switch (type) {
    case 'mobile':
      return Smartphone;
    case 'tablet':
      return Tablet;
    default:
      return Monitor;
  }
}

function formatDateTime(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date(iso));
}

export default function ActiveRemoteSessionsPanel({
  locale,
  sessions,
  loading,
  loadError,
  onReload,
}: ActiveRemoteSessionsPanelProps) {
  const isTh = locale === 'th';
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busyFp, setBusyFp] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const remoteSessions = sessions.filter((s) => !s.isCurrentDevice);

  const handleRevokeOne = async (sessionFingerprint: string) => {
    if (pin.length < PIN_LENGTH) {
      setError(isTh ? 'กรอกรหัสหลัก 6 หลักก่อนบังคับออก' : 'Enter master PIN first');
      return;
    }
    setBusyFp(sessionFingerprint);
    setError(null);
    try {
      const result = await forceRevokeDeviceSession(
        pin,
        sessionFingerprint,
        collectClientDeviceInfo()
      );
      if (!result.success) {
        setError(result.error ?? (isTh ? 'บังคับออกไม่สำเร็จ' : 'Revoke failed'));
        return;
      }
      setPin('');
      await onReload();
    } finally {
      setBusyFp(null);
    }
  };

  const handleRevokeAll = async () => {
    if (pin.length < PIN_LENGTH) {
      setError(isTh ? 'กรอกรหัสหลัก 6 หลักก่อนบังคับออก' : 'Enter master PIN first');
      return;
    }
    const confirmed = window.confirm(
      isTh
        ? 'บังคับออกจากระบบทุกเครื่องอื่นใช่ไหม?'
        : 'Sign out all other devices?'
    );
    if (!confirmed) return;

    setBulkLoading(true);
    setError(null);
    try {
      const result = await forceRevokeAllRemoteSessions(
        pin,
        sessions.map((s) => s.sessionFingerprint),
        collectClientDeviceInfo()
      );
      if (!result.success) {
        setError(result.error ?? (isTh ? 'บังคับออกไม่สำเร็จ' : 'Revoke failed'));
        return;
      }
      setPin('');
      await onReload();
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className={SETTINGS_PANEL_DANGER}>
      <div className="flex items-start gap-3">
        <SettingsIconBadge size="md" tone="danger">
          <LogOut size={14} strokeWidth={1.75} />
        </SettingsIconBadge>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-foreground leading-snug">
            {isTh ? 'บังคับออกจากระบบ' : 'Force sign out'}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-normal">
            {isTh
              ? 'ออกจากระบบบนอุปกรณ์อื่น ต้องใช้รหัสหลัก'
              : 'Sign out other devices master PIN required'}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="password"
          name="master-pin"
          id="settings-master-pin"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          maxLength={PIN_LENGTH}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH));
            setError(null);
          }}
          disabled={bulkLoading || Boolean(busyFp)}
          aria-label={isTh ? 'รหัสหลัก 6 หลัก' : 'Master PIN'}
          placeholder={isTh ? 'รหัสหลัก 6 หลัก' : 'Master PIN'}
          className={cn(SETTINGS_FIELD, 'h-9 sm:max-w-[160px] text-[13px]')}
        />
        {remoteSessions.length > 1 && (
          <button
            type="button"
            onClick={() => void handleRevokeAll()}
            disabled={bulkLoading || pin.length < PIN_LENGTH || Boolean(busyFp)}
            className={cn(
              SETTINGS_BTN_DANGER,
              'h-9 min-h-[44px] shrink-0 px-3 text-[12px]',
            )}
          >
            {bulkLoading
              ? isTh
                ? 'กำลังบังคับออก...'
                : 'Revoking...'
              : isTh
                ? 'บังคับออกทุกเครื่องอื่น'
                : 'Revoke all others'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="h-12 rounded-xl bg-muted/40 animate-pulse" />
      ) : loadError ? (
        <div className="space-y-2">
          <p className="text-[12px] text-red-500">
            {isTh ? 'โหลดรายการอุปกรณ์ไม่ได้' : 'Could not load active devices'}
          </p>
          <button
            type="button"
            onClick={() => void onReload()}
            className={SETTINGS_BTN_GHOST}
          >
            {isTh ? 'ลองใหม่' : 'Try again'}
          </button>
        </div>
      ) : remoteSessions.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">
          {isTh ? 'ไม่มีอุปกรณ์อื่นที่ยังล็อกอินอยู่' : 'No other devices are still signed in'}
        </p>
      ) : (
        <ul className="space-y-2">
          {remoteSessions.map((session) => {
            const Icon = deviceIcon(session.deviceType);
            return (
              <li
                key={session.sessionFingerprint}
                className={cn(SETTINGS_LIST_ITEM, 'flex items-center gap-3')}
              >
                <SettingsIconBadge size="sm" tone="neutral">
                  <Icon size={13} strokeWidth={1.75} />
                </SettingsIconBadge>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-foreground leading-snug truncate">
                    {formatLoginDeviceLabel(
                      {
                        deviceType: session.deviceType,
                        deviceVendor: session.deviceVendor,
                        deviceModel: session.deviceModel,
                        osName: session.osName,
                        osVersion: session.osVersion,
                        browserName: session.browserName,
                      },
                      isTh
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDateTime(session.lastLoginAt, locale)}
                    {session.accessLevel === 'read_only'
                      ? isTh
                        ? ' · ดูอย่างเดียว'
                        : ' · view only'
                      : isTh
                        ? ' · แก้ไขได้'
                        : ' · can edit'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRevokeOne(session.sessionFingerprint)}
                  disabled={busyFp === session.sessionFingerprint || pin.length < PIN_LENGTH}
                  className={cn(
                    SETTINGS_BTN_DANGER,
                    'shrink-0 px-2.5 py-1.5 h-auto min-h-[44px] text-[11px]',
                  )}
                >
                  {busyFp === session.sessionFingerprint
                    ? '...'
                    : isTh
                      ? 'บังคับออก'
                      : 'Revoke'}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {sessions.some((s) => s.isCurrentDevice) && (
        <p className="text-[11px] text-muted-foreground">
          {isTh
            ? 'เครื่องนี้ยังล็อกอินอยู่ ใช้เมนูด้านข้างเพื่อออกจากระบบ'
            : 'This device stays signed in use the sidebar to sign out'}
        </p>
      )}

      {error && (
        <p className="text-[11px] text-red-500 leading-normal" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
