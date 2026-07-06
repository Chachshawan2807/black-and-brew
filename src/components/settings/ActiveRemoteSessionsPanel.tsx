'use client';

import { useCallback, useEffect, useState } from 'react';
import { LogOut, Monitor, Smartphone, Tablet } from 'lucide-react';
import { fetchActiveLoginSessions } from '@/app/actions/login-history-actions';
import type { ActiveLoginSession } from '@/lib/login-session-status';
import {
  forceRevokeAllRemoteSessions,
  forceRevokeDeviceSession,
} from '@/app/actions/auth';
import { collectClientDeviceInfo } from '@/lib/client-device-info';
import { formatLoginDeviceLabel } from '@/lib/format-login-device';
import { cn } from '@/lib/utils';

const PIN_LENGTH = 6;

interface ActiveRemoteSessionsPanelProps {
  locale: string;
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

export default function ActiveRemoteSessionsPanel({ locale }: ActiveRemoteSessionsPanelProps) {
  const isTh = locale === 'th';
  const [sessions, setSessions] = useState<ActiveLoginSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busyFp, setBusyFp] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    const result = await fetchActiveLoginSessions();
    if (result.success) {
      setSessions(result.sessions);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch sessions on mount
    void loadSessions();
  }, [loadSessions]);

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
      await loadSessions();
    } finally {
      setBusyFp(null);
    }
  };

  const handleRevokeAll = async () => {
    if (pin.length < PIN_LENGTH) {
      setError(isTh ? 'กรอกรหัสหลัก 6 หลักก่อนบังคับออก' : 'Enter master PIN first');
      return;
    }
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
      await loadSessions();
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.03] px-3.5 py-3 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
          <LogOut size={14} strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-foreground leading-snug">
            {isTh ? 'บังคับออกจากระบบ (อุปกรณ์อื่น)' : 'Force sign out (other devices)'}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-normal">
            {isTh
              ? 'อุปกรณ์ที่ยังล็อกอินอยู่จากประวัติ — ต้องใช้รหัสหลัก (สิทธิ์แก้ไข)'
              : 'Devices still signed in per history — master PIN required'}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="password"
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
          className={cn(
            'h-9 w-full sm:max-w-[160px] rounded-xl border border-border bg-background px-3',
            'text-[13px] text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-foreground/10'
          )}
        />
        {remoteSessions.length > 1 && (
          <button
            type="button"
            onClick={() => void handleRevokeAll()}
            disabled={bulkLoading || pin.length < PIN_LENGTH || Boolean(busyFp)}
            className={cn(
              'h-9 shrink-0 rounded-xl px-3 text-[12px] bb-transition border border-red-500/30',
              'text-red-600 hover:bg-red-500/10',
              'disabled:opacity-40 disabled:cursor-not-allowed'
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
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/70">
                  <Icon size={13} strokeWidth={1.75} />
                </div>
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
                    'shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] bb-transition',
                    'bg-red-500 text-white hover:bg-red-600',
                    'disabled:opacity-40 disabled:cursor-not-allowed'
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
            ? 'เครื่องนี้ยังล็อกอินอยู่ — ใช้เมนูด้านข้างเพื่อออกจากระบบ'
            : 'This device stays signed in — use the sidebar to sign out'}
        </p>
      )}

      {error && <p className="text-[11px] text-red-500 leading-normal">{error}</p>}
    </div>
  );
}
