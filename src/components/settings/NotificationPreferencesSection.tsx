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

  useEffect(() => {
    saveNotificationPreferences(prefs);
  }, [prefs]);

  const update = (patch: Partial<NotificationPreferences>) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
  };

  const handleSystemNotifications = async (enabled: boolean) => {
    if (!enabled) {
      update({ systemNotifications: false });
      return;
    }
    const state = await requestNotificationPermission();
    setPermission(state);
    update({ systemNotifications: state === 'granted' });
  };

  return (
    <div>
      <ToggleRow
        label={isTh ? 'เปิดแจ้งเตือนคลังสินค้า' : 'Inventory notifications'}
        description={
          isTh
            ? 'รับการแจ้งเตือนเมื่อมีการเปลี่ยนแปลงข้อมูลคลังสินค้า'
            : 'Get alerts when inventory data changes'
        }
        checked={prefs.enabled}
        onChange={(v) => update({ enabled: v })}
      />
      <ToggleRow
        label={isTh ? 'แจ้งเตือนบนหน้าจอ / ไอคอนแอป' : 'Home-screen & OS alerts'}
        description={
          isTh
            ? 'ตัวเลขบนไอคอนแอป แบนเนอร์แจ้งเตือนทันที (รวมเมื่อเปิดแอปอยู่) — อนุญาตการแจ้งเตือนใน iOS/Android/iPad'
            : 'App icon badge and instant OS alerts (including while the app is open) — allow notifications on iOS/Android/iPad'
        }
        checked={prefs.systemNotifications}
        onChange={(v) => void handleSystemNotifications(v)}
        disabled={!prefs.enabled || permission === 'unsupported'}
      />
      {permission === 'denied' && (
        <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-2">
          {isTh
            ? 'การแจ้งเตือนถูกปิดในระบบ — เปิดได้จากการตั้งค่าของเบราว์เซอร์หรืออุปกรณ์'
            : 'Notifications are blocked — enable them in browser or device settings'}
        </p>
      )}
      <ToggleRow
        label={isTh ? 'แจ้งการเปลี่ยนแปลงของตัวเอง' : 'Notify my own changes'}
        description={
          isTh
            ? 'แจ้งเตือนแม้คุณเป็นคนแก้ไขเองบนเครื่องนี้ — ปิดเพื่อไม่ให้รบกวนเมื่อทำงานคนเดียว'
            : 'Alert even when you edit on this device — turn off to avoid noise when working alone'
        }
        checked={prefs.notifyOwnChanges}
        onChange={(v) => update({ notifyOwnChanges: v })}
        disabled={!prefs.enabled}
      />
      <ToggleRow
        label={isTh ? 'แจ้งเมื่อเพิ่มรายการ' : 'Notify on create'}
        description={
          isTh
            ? 'แจ้งเมื่อมีการเพิ่มสินค้าใหม่ในคลัง'
            : 'Alert when a new inventory item is added'
        }
        checked={prefs.notifyCreate}
        onChange={(v) => update({ notifyCreate: v })}
        disabled={!prefs.enabled}
      />
      <ToggleRow
        label={isTh ? 'แจ้งเมื่อแก้ไข' : 'Notify on update'}
        description={
          isTh
            ? 'แจ้งเมื่อมีการเปลี่ยนจำนวน ชื่อ หรือข้อมูลอื่นของสินค้า'
            : 'Alert when stock, name, or other item details change'
        }
        checked={prefs.notifyUpdate}
        onChange={(v) => update({ notifyUpdate: v })}
        disabled={!prefs.enabled}
      />
      <ToggleRow
        label={isTh ? 'แจ้งเมื่อลบ' : 'Notify on delete'}
        description={
          isTh
            ? 'แจ้งเมื่อมีการลบสินค้าออกจากคลัง'
            : 'Alert when an item is removed from inventory'
        }
        checked={prefs.notifyDelete}
        onChange={(v) => update({ notifyDelete: v })}
        disabled={!prefs.enabled}
      />
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-3">
        <Bell size={12} strokeWidth={1.75} />
        {isTh
          ? 'การตั้งค่าบันทึกในอุปกรณ์นี้'
          : 'Preferences are saved on this device'}
      </p>
    </div>
  );
}
