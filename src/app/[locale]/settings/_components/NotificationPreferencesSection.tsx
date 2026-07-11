'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  isNotificationMasterEnabled,
  loadNotificationPreferences,
  notificationMasterPatch,
  saveNotificationPreferences,
} from '@/lib/notification-preferences';
import {
  getNotificationPermissionState,
  requestNotificationPermission,
} from '@/lib/pwa-notification-bridge';
import { getPushDiagnostics } from '@/app/actions/push-actions';
import {
  ensurePushSubscriptionFromUserGesture,
  formatPushRegistrationError,
  getLastPushRegistrationError,
  hasActivePushSubscription,
  refreshLocalPushSubscriptionState,
  requiresUserGestureForPushSubscribe,
  syncPushPrefsToServer,
  wantsPushRegistration,
} from '@/lib/push-subscription-client';
import type { NotificationPreferences } from '@/lib/notification-types';

interface NotificationPreferencesSectionProps {
  locale: string;
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 py-3 border-b border-border last:border-0',
        disabled && 'opacity-50'
      )}
    >
      <div className="min-w-0 select-none">
        <p className="text-[14px] text-foreground leading-snug">{label}</p>
        {description && (
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-normal">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full bb-transition',
          checked ? 'bg-foreground/80' : 'bg-muted',
          disabled && 'cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-6 w-6 rounded-full bg-background bb-shadow-sm bb-transition',
            checked ? 'left-[22px]' : 'left-0.5'
          )}
        />
      </button>
    </div>
  );
}

export default function NotificationPreferencesSection({
  locale,
}: NotificationPreferencesSectionProps) {
  const isTh = locale === 'th';
  const isIos = requiresUserGestureForPushSubscribe();
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => loadNotificationPreferences());
  const [permission, setPermission] = useState(() => getNotificationPermissionState());
  const [deviceRegistered, setDeviceRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [diag, setDiag] = useState<{
    subscriptionCount: number;
    vapidConfigured: boolean;
  } | null>(null);

  const refreshDeviceState = useCallback(async () => {
    const hasLocal = await refreshLocalPushSubscriptionState();
    setDeviceRegistered(hasLocal || hasActivePushSubscription());
    const err = getLastPushRegistrationError();
    setRegisterError(err ? formatPushRegistrationError(err, isTh) : null);
  }, [isTh]);

  useEffect(() => {
    saveNotificationPreferences(prefs);
    void syncPushPrefsToServer(prefs, locale).then(() => refreshDeviceState());
  }, [prefs, locale, refreshDeviceState]);

  useEffect(() => {
    void refreshDeviceState();
  }, [refreshDeviceState]);

  useEffect(() => {
    void getPushDiagnostics().then((result) => {
      if (result.ok) {
        setDiag({
          subscriptionCount: result.subscriptionCount,
          vapidConfigured: result.vapidConfigured,
        });
      }
    });
  }, [prefs.systemNotifications, deviceRegistered]);

  const update = (patch: Partial<NotificationPreferences>) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
  };

  const registerThisDevice = async (): Promise<boolean> => {
    setRegistering(true);
    setRegisterError(null);
    try {
      const state = await requestNotificationPermission();
      setPermission(state);
      if (state !== 'granted') {
        setRegisterError(formatPushRegistrationError('permission_denied', isTh));
        return false;
      }

      const ok = await ensurePushSubscriptionFromUserGesture(locale);
      await refreshDeviceState();
      if (!ok) {
        const err = getLastPushRegistrationError();
        setRegisterError(
          err ? formatPushRegistrationError(err, isTh) : formatPushRegistrationError('ensure_failed', isTh),
        );
        return false;
      }

      await syncPushPrefsToServer(prefs, locale);
      return true;
    } finally {
      setRegistering(false);
    }
  };

  const handleMasterNotifications = async (enabled: boolean) => {
    if (!enabled) {
      const nextPrefs = { ...prefs, ...notificationMasterPatch(false) };
      setPrefs(nextPrefs);
      await syncPushPrefsToServer(nextPrefs, locale);
      await refreshDeviceState();
      return;
    }

    const state = await requestNotificationPermission();
    setPermission(state);
    const granted = state === 'granted';
    const nextPrefs = { ...prefs, ...notificationMasterPatch(granted) };
    setPrefs(nextPrefs);
    if (granted) {
      await ensurePushSubscriptionFromUserGesture(locale);
    }
    await syncPushPrefsToServer(nextPrefs, locale);
    await refreshDeviceState();
  };

  const handleDailyScheduleReports = async (enabled: boolean) => {
    if (!enabled) {
      update({ dailyScheduleReports: false });
      await syncPushPrefsToServer({ ...prefs, dailyScheduleReports: false }, locale);
      await refreshDeviceState();
      return;
    }
    const state = await requestNotificationPermission();
    setPermission(state);
    const nextPrefs = { ...prefs, dailyScheduleReports: state === 'granted' };
    update({ dailyScheduleReports: state === 'granted' });
    if (state === 'granted') {
      await ensurePushSubscriptionFromUserGesture(locale);
    }
    await syncPushPrefsToServer(nextPrefs, locale);
    await refreshDeviceState();
  };

  const handleSystemNotifications = async (enabled: boolean) => {
    if (!enabled) {
      update({ systemNotifications: false });
      await syncPushPrefsToServer({ ...prefs, systemNotifications: false }, locale);
      await refreshDeviceState();
      return;
    }
    const state = await requestNotificationPermission();
    setPermission(state);
    const nextPrefs = { ...prefs, systemNotifications: state === 'granted' };
    update({ systemNotifications: state === 'granted' });
    if (state === 'granted') {
      await ensurePushSubscriptionFromUserGesture(locale);
    }
    await syncPushPrefsToServer(nextPrefs, locale);
    await refreshDeviceState();
  };

  const wantsPush = wantsPushRegistration(prefs);
  const masterOn = isNotificationMasterEnabled(prefs);
  const showIosRegister =
    isIos && wantsPush && permission !== 'denied' && !deviceRegistered;

  return (
    <div>
      <ToggleRow
        label={isTh ? 'การแจ้งเตือน' : 'Notifications'}
        description={
          isTh
            ? 'เปิดหรือปิดการแจ้งเตือนทั้งหมดบนเครื่องนี้'
            : 'Turn all alerts on or off on this device'
        }
        checked={masterOn}
        onChange={(v) => void handleMasterNotifications(v)}
        disabled={permission === 'unsupported'}
      />
      {permission === 'denied' && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-2">
          {isTh
            ? 'การแจ้งเตือนถูกปิดอยู่ — เปิดได้ในการตั้งค่าอุปกรณ์'
            : 'Notifications are blocked — enable them in device settings'}
        </p>
      )}
      {wantsPush && permission === 'granted' && (
        <p
          className={cn(
            'text-[11px] mb-2',
            deviceRegistered ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
          )}
        >
          {deviceRegistered
            ? isTh
              ? 'เครื่องนี้ลงทะเบียนรับการแจ้งเตือนแล้ว'
              : 'This device is registered for push alerts'
            : isTh
              ? 'เครื่องนี้ยังไม่ได้ลงทะเบียนรับการแจ้งเตือน'
              : 'This device is not registered for push alerts'}
        </p>
      )}
      {showIosRegister && (
        <button
          type="button"
          disabled={registering}
          onClick={() => void registerThisDevice()}
          className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-[13px] text-foreground disabled:opacity-60"
        >
          {registering ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} strokeWidth={1.75} />}
          {isTh ? 'ลงทะเบียนการแจ้งเตือนบนเครื่องนี้' : 'Register notifications on this device'}
        </button>
      )}
      {registerError && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-2">{registerError}</p>
      )}
      {diag && wantsPush && (
        <p className="text-[11px] text-muted-foreground mb-2">
          {isTh
            ? `เซิร์ฟเวอร์: ${diag.vapidConfigured ? 'พร้อม' : 'ยังไม่พร้อม'} · ลงทะเบียนทั้งหมด ${diag.subscriptionCount} เครื่อง`
            : `Server: ${diag.vapidConfigured ? 'ready' : 'not ready'} · ${diag.subscriptionCount} device(s) registered`}
        </p>
      )}

      {masterOn && (
        <>
          <p className="text-[11px] text-muted-foreground pt-2 pb-1">
            {isTh ? 'ปรับรายละเอียด' : 'Fine-tune'}
          </p>
          <ToggleRow
            label={isTh ? 'สรุปตารางงานรายวัน' : 'Daily schedule summary'}
            description={
              isTh
                ? 'รับสรุปตารางงานอัตโนมัติเวลา 05:00 และ 18:00'
                : 'Automatic schedule summary at 05:00 and 18:00'
            }
            checked={prefs.dailyScheduleReports}
            onChange={(v) => void handleDailyScheduleReports(v)}
            disabled={permission === 'unsupported'}
          />
          <ToggleRow
            label={isTh ? 'แจ้งเตือนคลังสินค้า' : 'Inventory alerts'}
            description={
              isTh
                ? 'แจ้งเมื่อเพิ่ม แก้ไข หรือลบสินค้าในคลัง'
                : 'Notify when inventory items are added, edited, or removed'
            }
            checked={prefs.enabled}
            onChange={(v) => update({ enabled: v })}
          />
          <ToggleRow
            label={isTh ? 'แจ้งเตือนระบบ' : 'System notifications'}
            description={
              isTh
                ? 'แจ้งเตือนแม้ปิดแอป พร้อมตัวเลขบนไอคอน'
                : 'Alerts even when the app is closed, with an icon badge'
            }
            checked={prefs.systemNotifications}
            onChange={(v) => void handleSystemNotifications(v)}
            disabled={permission === 'unsupported'}
          />
          <ToggleRow
            label={isTh ? 'แจ้งการแก้ไขของตัวเอง' : 'Notify my own edits'}
            description={
              isTh
                ? 'แจ้งแม้คุณเป็นคนแก้ไขเอง — ปิดได้ถ้าทำงานคนเดียว'
                : 'Notify even when you make the change — turn off if you work alone'
            }
            checked={prefs.notifyOwnChanges}
            onChange={(v) => update({ notifyOwnChanges: v })}
          />
        </>
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-3">
        <Bell size={12} strokeWidth={1.75} />
        {isTh
          ? 'บันทึกการตั้งค่าไว้ในอุปกรณ์นี้'
          : 'Saved on this device'}
      </p>
    </div>
  );
}
