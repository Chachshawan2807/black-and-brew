'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
} from '@/lib/notification-preferences';
import {
  getNotificationPermissionState,
  requestNotificationPermission,
} from '@/lib/pwa-notification-bridge';
import { getPushDiagnostics } from '@/app/actions/push-actions';
import { syncPushPrefsToServer } from '@/lib/push-subscription-client';
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
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => loadNotificationPreferences());
  const [permission, setPermission] = useState(() => getNotificationPermissionState());
  const [diag, setDiag] = useState<{
    subscriptionCount: number;
    vapidConfigured: boolean;
  } | null>(null);

  useEffect(() => {
    saveNotificationPreferences(prefs);
    void syncPushPrefsToServer(prefs, locale);
  }, [prefs, locale]);

  useEffect(() => {
    void getPushDiagnostics().then((result) => {
      if (result.ok) {
        setDiag({
          subscriptionCount: result.subscriptionCount,
          vapidConfigured: result.vapidConfigured,
        });
      }
    });
  }, [prefs.systemNotifications]);

  const update = (patch: Partial<NotificationPreferences>) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
  };

  const handleDailyScheduleReports = async (enabled: boolean) => {
    if (!enabled) {
      update({ dailyScheduleReports: false });
      await syncPushPrefsToServer({ ...prefs, dailyScheduleReports: false }, locale);
      return;
    }
    const state = await requestNotificationPermission();
    setPermission(state);
    const nextPrefs = { ...prefs, dailyScheduleReports: state === 'granted' };
    update({ dailyScheduleReports: state === 'granted' });
    await syncPushPrefsToServer(nextPrefs, locale);
  };

  const handleSystemNotifications = async (enabled: boolean) => {
    if (!enabled) {
      update({ systemNotifications: false });
      await syncPushPrefsToServer({ ...prefs, systemNotifications: false }, locale);
      return;
    }
    const state = await requestNotificationPermission();
    setPermission(state);
    const nextPrefs = { ...prefs, systemNotifications: state === 'granted' };
    update({ systemNotifications: state === 'granted' });
    await syncPushPrefsToServer(nextPrefs, locale);
  };

  return (
    <div>
      <ToggleRow
        label={isTh ? 'สรุปตารางงานรายวัน' : 'Daily schedule summary'}
        description={
          isTh
            ? 'รับสรุปตารางงานอัตโนมัติเวลา 05:00 และ 18:00'
            : 'Automatic schedule summary at 05:00 and 18:00'
        }
        checked={prefs.dailyScheduleReports}
        onChange={(v) => void handleDailyScheduleReports(v)}
        disabled={!prefs.enabled || permission === 'unsupported'}
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
        disabled={!prefs.enabled || permission === 'unsupported'}
      />
      {permission === 'denied' && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-2">
          {isTh
            ? 'การแจ้งเตือนถูกปิดอยู่ — เปิดได้ในการตั้งค่าอุปกรณ์'
            : 'Notifications are blocked — enable them in device settings'}
        </p>
      )}
      {diag && prefs.systemNotifications && (
        <p className="text-[11px] text-muted-foreground mb-2">
          {isTh
            ? `สถานะ: ${diag.vapidConfigured ? 'พร้อมใช้งาน' : 'ยังไม่พร้อม'} · อุปกรณ์ ${diag.subscriptionCount} เครื่อง`
            : `Status: ${diag.vapidConfigured ? 'ready' : 'not ready'} · ${diag.subscriptionCount} device(s)`}
        </p>
      )}
      <ToggleRow
        label={isTh ? 'แจ้งการแก้ไขของตัวเอง' : 'Notify my own edits'}
        description={
          isTh
            ? 'แจ้งแม้คุณเป็นคนแก้ไขเอง — ปิดได้ถ้าทำงานคนเดียว'
            : 'Notify even when you make the change — turn off if you work alone'
        }
        checked={prefs.notifyOwnChanges}
        onChange={(v) => update({ notifyOwnChanges: v })}
        disabled={!prefs.enabled}
      />
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-3">
        <Bell size={12} strokeWidth={1.75} />
        {isTh
          ? 'บันทึกการตั้งค่าไว้ในอุปกรณ์นี้'
          : 'Saved on this device'}
      </p>
    </div>
  );
}
