'use client';

import { LoadingIcon } from '@/components/ui/loading-icon';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from '@/lib/icons';
import { cn } from '@/lib/utils';
import {
  isNotificationMasterEnabled,
  loadNotificationPreferences,
  notificationMasterPatch,
  saveNotificationPreferences,
  setNotificationUserOptOut } from '@/lib/notification-preferences';
import {
  getNotificationPermissionState,
  requestNotificationPermission } from '@/lib/pwa-notification-bridge';
import { getPushDiagnostics } from '@/app/actions/push-actions';
import {
  ensurePushSubscriptionFromUserGesture,
  formatPushRegistrationError,
  getLastPushRegistrationError,
  getLastPushRegistrationDetail,
  hasLocalPushSubscription,
  hasServerPushRegistration,
  reconcileDevicePushRegistration,
  refreshLocalPushSubscriptionState,
  PUSH_REGISTRATION_UPDATED_EVENT,
  schedulePushSubscriptionMaintenance,
  syncPushPrefsToServer,
  warmPushRegistrationStack,
  wantsPushRegistration } from '@/lib/push-subscription-client';
import type { NotificationPreferences } from '@/lib/notification-types';
import { scheduleIdleWork } from '@/lib/schedule-idle-work';
import {
  SETTINGS_BTN_PRIMARY,
  settingsSwitchThumb,
  settingsSwitchTrack,
} from './settings-ui-primitives';

interface NotificationPreferencesSectionProps {
  locale: string;
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled }: {
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
          settingsSwitchTrack(checked, disabled),
          'shrink-0 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15',
        )}
      >
        <span className={settingsSwitchThumb(checked)} aria-hidden />
      </button>
    </div>
  );
}

export default function NotificationPreferencesSection({
  locale }: NotificationPreferencesSectionProps) {
  const isTh = locale === 'th';
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => loadNotificationPreferences());
  const [permission, setPermission] = useState(() => getNotificationPermissionState());
  const [devicePushState, setDevicePushState] = useState<'none' | 'local_only' | 'server'>('none');
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [diag, setDiag] = useState<{
    subscriptionCount: number;
    appleSubscriptionCount: number;
    fcmSubscriptionCount: number;
    vapidConfigured: boolean;
  } | null>(null);
  const prefsHydratedRef = useRef(false);
  const skipNextAutomaticPrefsSyncRef = useRef(false);
  const wantsPush = wantsPushRegistration(prefs);

  const refreshDeviceState = useCallback(async (options?: { fromUserGesture?: boolean }) => {
    const permissionState = getNotificationPermissionState();
    setPermission(permissionState);

    let nextState: 'none' | 'local_only' | 'server' = 'none';
    if (wantsPushRegistration(prefs) && permissionState === 'granted') {
      nextState = await reconcileDevicePushRegistration(locale, options);
      setDevicePushState(nextState);
    } else {
      await refreshLocalPushSubscriptionState();
      const hasLocal = hasLocalPushSubscription();
      const hasServer = hasServerPushRegistration();
      nextState = hasServer ? 'server' : hasLocal ? 'local_only' : 'none';
      setDevicePushState(nextState);
    }

    const err = getLastPushRegistrationError();
    setRegisterError(err ? formatPushRegistrationError(err, isTh) : null);
    return nextState;
  }, [isTh, locale, prefs]);

  useEffect(() => {
    if (!prefsHydratedRef.current) {
      prefsHydratedRef.current = true;
      warmPushRegistrationStack();
      schedulePushSubscriptionMaintenance(locale, { immediate: true });
      void refreshDeviceState();
      const cancelRetry = scheduleIdleWork(() => {
        void refreshDeviceState();
      }, { timeout: 900 });
      return () => {
        cancelRetry();
      };
    }

    saveNotificationPreferences(prefs);
    if (skipNextAutomaticPrefsSyncRef.current) {
      skipNextAutomaticPrefsSyncRef.current = false;
      return;
    }
    void syncPushPrefsToServer(prefs, locale).then(() => refreshDeviceState());
  }, [prefs, locale, refreshDeviceState]);

  useEffect(() => {
    const onRegistrationUpdated = () => {
      void refreshDeviceState();
    };
    window.addEventListener(PUSH_REGISTRATION_UPDATED_EVENT, onRegistrationUpdated);
    window.addEventListener('bb-pin-authenticated', onRegistrationUpdated);
    return () => {
      window.removeEventListener(PUSH_REGISTRATION_UPDATED_EVENT, onRegistrationUpdated);
      window.removeEventListener('bb-pin-authenticated', onRegistrationUpdated);
    };
  }, [refreshDeviceState]);

  useEffect(() => {
    if (!wantsPush) return;

    let cancelled = false;
    const loadDiagnostics = () => {
      void getPushDiagnostics().then((result) => {
        if (cancelled || !result.ok) return;
        setDiag({
          subscriptionCount: result.subscriptionCount,
          appleSubscriptionCount: result.appleSubscriptionCount,
          fcmSubscriptionCount: result.fcmSubscriptionCount,
          vapidConfigured: result.vapidConfigured });
      });
    };

    const cancelIdle = scheduleIdleWork(loadDiagnostics, { timeout: 3000 });
    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [wantsPush, devicePushState]);

  const update = (patch: Partial<NotificationPreferences>) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
  };

  const registerThisDevice = async (): Promise<boolean> => {
    setRegistering(true);
    setRegisterError(null);
    try {
      warmPushRegistrationStack();
      const ok = await ensurePushSubscriptionFromUserGesture(locale);
      setPermission(getNotificationPermissionState());
      const deviceState = await refreshDeviceState({ fromUserGesture: true });
      if (ok && deviceState === 'server') {
        setRegisterError(null);
        return true;
      }

      const err = getLastPushRegistrationError() ?? 'ensure_failed';
      const detail = getLastPushRegistrationDetail();
      const formatted = formatPushRegistrationError(err, isTh);
      setRegisterError(detail ? `${formatted} (${detail})` : formatted);
      return false;
    } finally {
      setRegistering(false);
    }
  };

  const handleMasterNotifications = async (enabled: boolean) => {
    if (!enabled) {
      setNotificationUserOptOut(true);
      const nextPrefs = { ...prefs, ...notificationMasterPatch(false) };
      skipNextAutomaticPrefsSyncRef.current = true;
      setPrefs(nextPrefs);
      await syncPushPrefsToServer(nextPrefs, locale);
      await refreshDeviceState();
      return;
    }

    warmPushRegistrationStack();
    setNotificationUserOptOut(false);
    const state = await requestNotificationPermission();
    setPermission(state);
    const granted = state === 'granted';
    const nextPrefs = { ...prefs, ...notificationMasterPatch(granted) };
    skipNextAutomaticPrefsSyncRef.current = true;
    setPrefs(nextPrefs);
    if (granted) {
      const ok = await ensurePushSubscriptionFromUserGesture(locale);
      if (!ok) {
        await syncPushPrefsToServer(nextPrefs, locale);
      }
    } else {
      await syncPushPrefsToServer(nextPrefs, locale);
    }
    await refreshDeviceState();
  };

  const enablePushChannel = async (key: keyof NotificationPreferences) => {
    warmPushRegistrationStack();
    const state = await requestNotificationPermission();
    setPermission(state);
    const granted = state === 'granted';
    const resolvedPrefs = { ...prefs, [key]: granted } as NotificationPreferences;
    skipNextAutomaticPrefsSyncRef.current = true;
    setPrefs(resolvedPrefs);
    if (granted) {
      const ok = await ensurePushSubscriptionFromUserGesture(locale);
      if (!ok) {
        await syncPushPrefsToServer(resolvedPrefs, locale);
      }
    } else {
      await syncPushPrefsToServer(resolvedPrefs, locale);
    }
    await refreshDeviceState();
  };

  const handleDailyScheduleReports = async (enabled: boolean) => {
    if (!enabled) {
      skipNextAutomaticPrefsSyncRef.current = true;
      update({ dailyScheduleReports: false });
      await syncPushPrefsToServer({ ...prefs, dailyScheduleReports: false }, locale);
      await refreshDeviceState();
      return;
    }
    await enablePushChannel('dailyScheduleReports');
  };

  const handleProactiveInsights = async (enabled: boolean) => {
    if (!enabled) {
      skipNextAutomaticPrefsSyncRef.current = true;
      update({ proactiveInsights: false });
      await syncPushPrefsToServer({ ...prefs, proactiveInsights: false }, locale);
      await refreshDeviceState();
      return;
    }
    await enablePushChannel('proactiveInsights');
  };

  const handleSecurityAlerts = async (enabled: boolean) => {
    if (!enabled) {
      skipNextAutomaticPrefsSyncRef.current = true;
      update({ securityAlerts: false });
      await syncPushPrefsToServer({ ...prefs, securityAlerts: false }, locale);
      await refreshDeviceState();
      return;
    }
    await enablePushChannel('securityAlerts');
  };

  const handleSystemNotifications = async (enabled: boolean) => {
    if (!enabled) {
      skipNextAutomaticPrefsSyncRef.current = true;
      update({ systemNotifications: false });
      await syncPushPrefsToServer({ ...prefs, systemNotifications: false }, locale);
      await refreshDeviceState();
      return;
    }
    await enablePushChannel('systemNotifications');
  };

  const masterOn = isNotificationMasterEnabled(prefs);
  const showRegisterButton =
    wantsPush && permission !== 'denied' && devicePushState !== 'server';

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
            ? 'การแจ้งเตือนถูกปิดอยู่ เปิดได้ในการตั้งค่าอุปกรณ์'
            : 'Notifications are blocked enable them in device settings'}
        </p>
      )}
      {wantsPush && permission === 'granted' && (
        <p
          className={cn(
            'text-[11px] mb-2',
            devicePushState === 'server'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400',
          )}
        >
          {devicePushState === 'server'
            ? isTh
              ? 'ลงทะเบียนรับการแจ้งเตือนแล้ว'
              : 'This device is registered with the server alerts work when the app is closed'
            : devicePushState === 'local_only'
              ? isTh
                ? 'เครื่องนี้อนุญาตการแจ้งเตือนแล้ว แต่ยังไม่ได้ลงทะเบียนกับเซิร์ฟเวอร์ กดปุ่มด้านล่าง'
                : 'Notifications are allowed on this device but not registered with the server tap below'
              : isTh
                ? 'เครื่องนี้ยังไม่ได้ลงทะเบียนรับการแจ้งเตือน'
                : 'This device is not registered for push alerts'}
        </p>
      )}
      {showRegisterButton && (
        <button
          type="button"
          disabled={registering}
          onClick={() => void registerThisDevice()}
          className={cn(SETTINGS_BTN_PRIMARY, 'mb-2 w-full text-[13px] py-2.5 h-auto min-h-[44px]')}
        >
          {registering ? (
            <LoadingIcon size={16} className="animate-spin" aria-hidden />
          ) : (
            <Bell size={16} strokeWidth={1.75} aria-hidden />
          )}
          {isTh ? 'ลงทะเบียนการแจ้งเตือนบนเครื่องนี้' : 'Register notifications on this device'}
        </button>
      )}
      {registerError && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-2" role="alert">
          {registerError}
        </p>
      )}
      {diag && wantsPush && (
        <p className="text-[11px] text-muted-foreground mb-2">
          {isTh
            ? `เซิร์ฟเวอร์: ${diag.vapidConfigured ? 'พร้อม' : 'ยังไม่พร้อม'} · ลงทะเบียนทั้งหมด ${diag.subscriptionCount} เครื่อง (iPhone ${diag.appleSubscriptionCount} · Android ${diag.fcmSubscriptionCount})`
            : `Server: ${diag.vapidConfigured ? 'ready' : 'not ready'} · ${diag.subscriptionCount} device(s) (iPhone ${diag.appleSubscriptionCount} · Android ${diag.fcmSubscriptionCount})`}
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
            label={isTh ? 'การแจ้งเตือนที่ต้องตรวจสอบข้ามโมดูล' : 'Cross-module review alerts'}
            description={
              isTh
                ? 'เตือนเมื่อคนน้อย สต็อกต่ำ งานซ่อมค้าง หรือความเสี่ยงข้ามหน้าในเมนู'
                : 'Alert when staffing, stock, maintenance, or cross-menu risks appear'
            }
            checked={prefs.proactiveInsights}
            onChange={(v) => void handleProactiveInsights(v)}
            disabled={permission === 'unsupported'}
          />
          <ToggleRow
            label={isTh ? 'แจ้งเตือนความปลอดภัย' : 'Security alerts'}
            description={
              isTh
                ? 'เตือนเมื่อมีการพยายามเดา PIN จากภายนอก (lockout 15 นาที)'
                : 'Alert when repeated failed PIN attempts trigger a 15-minute lockout'
            }
            checked={prefs.securityAlerts}
            onChange={(v) => void handleSecurityAlerts(v)}
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
                ? 'แจ้งแม้คุณเป็นคนแก้ไขเอง ปิดได้ถ้าทำงานคนเดียว'
                : 'Notify even when you make the change turn off if you work alone'
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
