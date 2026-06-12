'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
} from '@/lib/notification-preferences';
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
    <label
      className={cn(
        'flex items-start justify-between gap-4 py-3 border-b border-border last:border-0',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      <div className="min-w-0">
        <p className="text-[14px] text-foreground leading-snug">{label}</p>
        {description && (
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-normal">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-7 w-12 shrink-0 rounded-full bb-transition',
          checked ? 'bg-foreground/80' : 'bg-muted'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-6 w-6 rounded-full bg-background bb-shadow-sm bb-transition',
            checked ? 'left-[22px]' : 'left-0.5'
          )}
        />
      </button>
    </label>
  );
}

export default function NotificationPreferencesSection({
  locale,
}: NotificationPreferencesSectionProps) {
  const isTh = locale === 'th';
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => loadNotificationPreferences());

  useEffect(() => {
    saveNotificationPreferences(prefs);
  }, [prefs]);

  const update = (patch: Partial<NotificationPreferences>) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
  };

  return (
    <div>
      <ToggleRow
        label={isTh ? 'เปิดแจ้งเตือนคลังสินค้า' : 'Inventory notifications'}
        description={
          isTh
            ? 'รับการแจ้งเตือนเมื่อมีการเปลี่ยนแปลงข้อมูลคลัง'
            : 'Get alerts when inventory data changes'
        }
        checked={prefs.enabled}
        onChange={(v) => update({ enabled: v })}
      />
      <ToggleRow
        label={isTh ? 'แสดง Toast' : 'Show toast alerts'}
        description={
          isTh
            ? 'แจ้งเตือนด่วนสำหรับการลบและสต็อกต่ำ'
            : 'Quick toasts for deletes and low stock'
        }
        checked={prefs.showToast}
        onChange={(v) => update({ showToast: v })}
        disabled={!prefs.enabled}
      />
      <ToggleRow
        label={isTh ? 'แจ้งการเปลี่ยนแปลงของตัวเอง' : 'Notify my own changes'}
        checked={prefs.notifyOwnChanges}
        onChange={(v) => update({ notifyOwnChanges: v })}
        disabled={!prefs.enabled}
      />
      <ToggleRow
        label={isTh ? 'แจ้งเมื่อเพิ่มรายการ' : 'Notify on create'}
        checked={prefs.notifyCreate}
        onChange={(v) => update({ notifyCreate: v })}
        disabled={!prefs.enabled}
      />
      <ToggleRow
        label={isTh ? 'แจ้งเมื่อแก้ไข' : 'Notify on update'}
        checked={prefs.notifyUpdate}
        onChange={(v) => update({ notifyUpdate: v })}
        disabled={!prefs.enabled}
      />
      <ToggleRow
        label={isTh ? 'แจ้งเมื่อลบ' : 'Notify on delete'}
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
